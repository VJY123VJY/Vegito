from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_seller
from app.models.user import User
from app.schemas.seller import SellerProfileRead, SellerProfileUpdate
from app.schemas.common import APIResponse
from app.services.seller_service import SellerService

router = APIRouter(prefix="/seller", tags=["Seller Profile"])


@router.get("/profile", response_model=APIResponse[SellerProfileRead], summary="Get seller profile")
def get_seller_profile(
    current_user: User = Depends(require_seller), db: Session = Depends(get_db)
):
    profile = SellerService.get_profile(db, current_user)
    return APIResponse(data=SellerProfileRead.model_validate(profile))


@router.patch("/profile", response_model=APIResponse[SellerProfileRead], summary="Update seller profile")
def update_seller_profile(
    payload: SellerProfileUpdate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    profile = SellerService.update_profile(db, current_user, payload)
    return APIResponse(message="Profile updated successfully", data=SellerProfileRead.model_validate(profile))
