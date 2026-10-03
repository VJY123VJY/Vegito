import os
import uuid
import mimetypes
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import (
    get_current_user,
    require_seller,
    require_delivery_partner,
    require_admin,
)
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.schemas.common import APIResponse
from app.schemas.kyc import (
    SellerKycSubmit,
    SellerKycRead,
    DeliveryPartnerKycSubmit,
    DeliveryPartnerKycRead,
    KycReviewAction,
    KycAuditRead,
)
from app.services.kyc_service import KycService
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException

router = APIRouter(tags=["KYC & Verification"])

SECURE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "secure_kyc"))
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


# ---------------------------------------------------------------------------
# Secure Document Upload & Private Access (Section 47)
# ---------------------------------------------------------------------------

@router.post("/kyc/upload", response_model=APIResponse[dict], summary="Upload private KYC document or shop photograph")
async def upload_kyc_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise BadRequestException("Missing filename")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequestException(f"Unsupported file format '{ext}'. Allowed: JPG, PNG, WEBP, PDF.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise BadRequestException("File size exceeds 5MB limit.")

    user_dir = os.path.join(SECURE_UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)

    safe_name = f"{doc_type}_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = os.path.join(user_dir, safe_name)

    with open(dest_path, "wb") as f:
        f.write(contents)

    # Document key: {user_id}/{safe_name}
    doc_key = f"{current_user.id}/{safe_name}"

    return APIResponse(
        message="Document securely uploaded",
        data={
            "document_key": doc_key,
            "filename": file.filename,
            "doc_type": doc_type,
            "url": f"/api/v1/kyc/document/{doc_key}",
        },
    )


@router.get("/kyc/document/{user_id}/{filename}", summary="Access secured KYC document with RBAC (Section 47)")
async def get_secure_document(
    user_id: int,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    # RBAC check: Only the document owner OR an admin can view private KYC docs
    is_admin = current_user.role_id in (4, 5)  # ADMIN or SUPER_ADMIN
    if current_user.id != user_id and not is_admin:
        raise ForbiddenException("You do not have authorization to view this document.")

    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SECURE_UPLOAD_DIR, str(user_id), safe_filename)

    if not os.path.isfile(file_path):
        raise NotFoundException("Document not found.")

    media_type, _ = mimetypes.guess_type(file_path)
    return FileResponse(file_path, media_type=media_type or "application/octet-stream")


# ---------------------------------------------------------------------------
# Seller KYC Endpoints
# ---------------------------------------------------------------------------

@router.get("/seller/kyc", response_model=APIResponse[SellerKycRead], summary="Get current seller KYC record")
def get_seller_kyc(
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    seller_profile = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
    if not seller_profile:
        raise NotFoundException("Seller profile not found")

    kyc = KycService.get_or_create_seller_kyc(db, seller_profile)
    return APIResponse(data=SellerKycRead.model_validate(kyc))


@router.post("/seller/kyc", response_model=APIResponse[SellerKycRead], summary="Submit seller shop proof and verification documents")
def submit_seller_kyc(
    payload: SellerKycSubmit,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    seller_profile = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
    if not seller_profile:
        raise NotFoundException("Seller profile not found")

    kyc = KycService.submit_seller_kyc(db, seller_profile, payload)
    return APIResponse(
        message="Shop verification documents submitted. Status is now UNDER REVIEW.",
        data=SellerKycRead.model_validate(kyc),
    )


# ---------------------------------------------------------------------------
# Delivery Partner KYC Endpoints
# ---------------------------------------------------------------------------

@router.get("/delivery/kyc", response_model=APIResponse[DeliveryPartnerKycRead], summary="Get current delivery partner KYC record")
def get_delivery_kyc(
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    delivery_partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not delivery_partner:
        raise NotFoundException("Delivery partner record not found")

    kyc = KycService.get_or_create_delivery_kyc(db, delivery_partner)
    return APIResponse(data=DeliveryPartnerKycRead.model_validate(kyc))


@router.post("/delivery/kyc", response_model=APIResponse[DeliveryPartnerKycRead], summary="Submit delivery partner license and vehicle documents")
def submit_delivery_kyc(
    payload: DeliveryPartnerKycSubmit,
    current_user: User = Depends(require_delivery_partner),
    db: Session = Depends(get_db),
):
    delivery_partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if not delivery_partner:
        raise NotFoundException("Delivery partner record not found")

    kyc = KycService.submit_delivery_kyc(db, delivery_partner, payload)
    return APIResponse(
        message="Delivery verification documents submitted. Status is now UNDER REVIEW.",
        data=DeliveryPartnerKycRead.model_validate(kyc),
    )


# ---------------------------------------------------------------------------
# Admin KYC Operations (Section 14, 46, 48)
# ---------------------------------------------------------------------------

@router.get("/admin/kyc/reviews", response_model=APIResponse[dict], summary="List all KYC submissions for admin review")
def list_admin_kyc_reviews(
    kyc_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    reviews = KycService.list_pending_reviews(db, kyc_type=kyc_type, status=status)
    return APIResponse(data=reviews)


@router.post("/admin/kyc/seller/{seller_profile_id}/review", response_model=APIResponse[SellerKycRead], summary="Review seller shop verification")
def review_seller_kyc(
    seller_profile_id: int,
    action: KycReviewAction,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    kyc = KycService.admin_review_seller(db, current_user, seller_profile_id, action)
    return APIResponse(
        message=f"Seller KYC marked as {kyc.status}",
        data=SellerKycRead.model_validate(kyc),
    )


@router.post("/admin/kyc/delivery/{delivery_partner_id}/review", response_model=APIResponse[DeliveryPartnerKycRead], summary="Review delivery partner verification")
def review_delivery_kyc(
    delivery_partner_id: int,
    action: KycReviewAction,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    kyc = KycService.admin_review_delivery(db, current_user, delivery_partner_id, action)
    return APIResponse(
        message=f"Delivery partner KYC marked as {kyc.status}",
        data=DeliveryPartnerKycRead.model_validate(kyc),
    )


@router.get("/admin/kyc/audits", response_model=APIResponse[List[KycAuditRead]], summary="Get KYC audit history")
def get_kyc_audits(
    target_id: Optional[int] = None,
    kyc_type: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    audits = KycService.get_audits(db, target_id=target_id, kyc_type=kyc_type)
    return APIResponse(data=[KycAuditRead.model_validate(a) for a in audits])
