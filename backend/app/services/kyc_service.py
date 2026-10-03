import os
import uuid
import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.kyc import SellerKyc, DeliveryPartnerKyc, KycAudit
from app.schemas.kyc import SellerKycSubmit, DeliveryPartnerKycSubmit, KycReviewAction
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.services.notification_service import NotificationService


def mask_id_number(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    cleaned = val.strip().replace(" ", "").replace("-", "")
    if len(cleaned) <= 4:
        return "****"
    return f"{'*' * (len(cleaned) - 4)}{cleaned[-4:]}"


def mask_bank_account(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    cleaned = val.strip()
    if len(cleaned) <= 4:
        return "****"
    return f"{'*' * (len(cleaned) - 4)}{cleaned[-4:]}"


class KycService:
    # -----------------------------------------------------------------------
    # Seller KYC
    # -----------------------------------------------------------------------

    @staticmethod
    def get_or_create_seller_kyc(db: Session, seller_profile: SellerProfile) -> SellerKyc:
        kyc = db.query(SellerKyc).filter(SellerKyc.seller_profile_id == seller_profile.id).first()
        if not kyc:
            kyc = SellerKyc(
                seller_profile_id=seller_profile.id,
                user_id=seller_profile.user_id,
                status=seller_profile.kyc_status or "DRAFT",
                business_type=seller_profile.business_type or "RETAIL_STORE",
            )
            db.add(kyc)
            db.commit()
            db.refresh(kyc)
        return kyc

    @staticmethod
    def submit_seller_kyc(
        db: Session,
        seller_profile: SellerProfile,
        payload: SellerKycSubmit,
    ) -> SellerKyc:
        kyc = KycService.get_or_create_seller_kyc(db, seller_profile)

        prev_status = kyc.status

        # Update business info
        kyc.business_type = payload.business_type
        if payload.business_proof_type:
            kyc.business_proof_type = payload.business_proof_type
        if payload.business_proof_number:
            kyc.business_proof_number = payload.business_proof_number
        if payload.business_proof_file:
            kyc.business_proof_file = payload.business_proof_file

        # Update photos
        if payload.shop_front_photo:
            kyc.shop_front_photo = payload.shop_front_photo
        if payload.shop_interior_photo:
            kyc.shop_interior_photo = payload.shop_interior_photo
        if payload.shop_signage_photo:
            kyc.shop_signage_photo = payload.shop_signage_photo

        # Update ID proof
        if payload.id_proof_type:
            kyc.id_proof_type = payload.id_proof_type
        if payload.id_proof_number:
            kyc.id_proof_number_masked = mask_id_number(payload.id_proof_number)
        if payload.id_proof_file:
            kyc.id_proof_file = payload.id_proof_file

        # Update selfie
        if payload.selfie_file:
            kyc.selfie_file = payload.selfie_file
            # Section 12: Real verification interface - keep status PENDING_VERIFICATION until third party confirms
            kyc.liveness_status = "PENDING_VERIFICATION"

        # Update bank
        if payload.bank_account_holder:
            kyc.bank_account_holder = payload.bank_account_holder
        if payload.bank_account_number:
            kyc.bank_account_number_masked = mask_bank_account(payload.bank_account_number)
        if payload.bank_ifsc:
            kyc.bank_ifsc = payload.bank_ifsc.upper().strip()
        if payload.bank_name:
            kyc.bank_name = payload.bank_name
        if payload.bank_upi_id:
            kyc.bank_upi_id = payload.bank_upi_id.strip()

        # Update status
        now = datetime.datetime.now(datetime.timezone.utc)
        kyc.status = "UNDER_REVIEW"
        kyc.submitted_at = now
        seller_profile.kyc_status = "UNDER_REVIEW"
        seller_profile.kyc_submitted_at = now
        # Verified badge remains False until admin approval
        seller_profile.is_verified = False

        # Record audit
        audit = KycAudit(
            kyc_type="SELLER",
            target_id=seller_profile.id,
            user_id=seller_profile.user_id,
            previous_status=prev_status,
            new_status="UNDER_REVIEW",
            decision="SUBMIT",
            reason="Seller submitted shop proof and verification documents",
        )
        db.add(audit)
        db.commit()
        db.refresh(kyc)
        return kyc

    # -----------------------------------------------------------------------
    # Delivery Partner KYC
    # -----------------------------------------------------------------------

    @staticmethod
    def get_or_create_delivery_kyc(db: Session, delivery_partner: DeliveryPartner) -> DeliveryPartnerKyc:
        kyc = db.query(DeliveryPartnerKyc).filter(DeliveryPartnerKyc.delivery_partner_id == delivery_partner.id).first()
        if not kyc:
            kyc = DeliveryPartnerKyc(
                delivery_partner_id=delivery_partner.id,
                user_id=delivery_partner.user_id,
                status=delivery_partner.kyc_status or "DRAFT",
                operating_city="Solapur",
            )
            db.add(kyc)
            db.commit()
            db.refresh(kyc)
        return kyc

    @staticmethod
    def submit_delivery_kyc(
        db: Session,
        delivery_partner: DeliveryPartner,
        payload: DeliveryPartnerKycSubmit,
    ) -> DeliveryPartnerKyc:
        kyc = KycService.get_or_create_delivery_kyc(db, delivery_partner)

        prev_status = kyc.status

        if payload.full_name:
            kyc.full_name = payload.full_name
        if payload.dob:
            kyc.dob = payload.dob
        if payload.emergency_contact_name:
            kyc.emergency_contact_name = payload.emergency_contact_name
        if payload.emergency_contact_phone:
            kyc.emergency_contact_phone = payload.emergency_contact_phone
        if payload.profile_photo:
            kyc.profile_photo = payload.profile_photo
        if payload.selfie_file:
            kyc.selfie_file = payload.selfie_file
            kyc.liveness_status = "PENDING_VERIFICATION"

        if payload.id_proof_type:
            kyc.id_proof_type = payload.id_proof_type
        if payload.id_proof_number:
            kyc.id_proof_number_masked = mask_id_number(payload.id_proof_number)
        if payload.id_proof_file:
            kyc.id_proof_file = payload.id_proof_file

        if payload.driving_license_number:
            kyc.driving_license_number = payload.driving_license_number
        if payload.driving_license_expiry:
            kyc.driving_license_expiry = payload.driving_license_expiry
        if payload.driving_license_file:
            kyc.driving_license_file = payload.driving_license_file

        if payload.vehicle_type:
            kyc.vehicle_type = payload.vehicle_type
            delivery_partner.vehicle_type = payload.vehicle_type
        if payload.vehicle_number:
            kyc.vehicle_number = payload.vehicle_number
            delivery_partner.vehicle_number = payload.vehicle_number
        if payload.rc_book_file:
            kyc.rc_book_file = payload.rc_book_file
        if payload.insurance_file:
            kyc.insurance_file = payload.insurance_file

        if payload.operating_city:
            kyc.operating_city = payload.operating_city
        if payload.operating_zone:
            kyc.operating_zone = payload.operating_zone

        if payload.bank_account_holder:
            kyc.bank_account_holder = payload.bank_account_holder
        if payload.bank_account_number:
            kyc.bank_account_number_masked = mask_bank_account(payload.bank_account_number)
        if payload.bank_ifsc:
            kyc.bank_ifsc = payload.bank_ifsc.upper().strip()
        if payload.bank_upi_id:
            kyc.bank_upi_id = payload.bank_upi_id.strip()

        now = datetime.datetime.now(datetime.timezone.utc)
        kyc.status = "UNDER_REVIEW"
        kyc.submitted_at = now
        delivery_partner.kyc_status = "UNDER_REVIEW"
        delivery_partner.kyc_submitted_at = now
        delivery_partner.is_verified = False

        audit = KycAudit(
            kyc_type="DELIVERY_PARTNER",
            target_id=delivery_partner.id,
            user_id=delivery_partner.user_id,
            previous_status=prev_status,
            new_status="UNDER_REVIEW",
            decision="SUBMIT",
            reason="Delivery partner submitted license, vehicle, and identity documents",
        )
        db.add(audit)
        db.commit()
        db.refresh(kyc)
        return kyc

    # -----------------------------------------------------------------------
    # Admin Reviews
    # -----------------------------------------------------------------------

    @staticmethod
    def admin_review_seller(
        db: Session,
        admin_user: User,
        seller_profile_id: int,
        action: KycReviewAction,
    ) -> SellerKyc:
        seller_profile = db.query(SellerProfile).filter(SellerProfile.id == seller_profile_id).first()
        if not seller_profile:
            raise NotFoundException(f"Seller profile #{seller_profile_id} not found")

        kyc = db.query(SellerKyc).filter(SellerKyc.seller_profile_id == seller_profile_id).first()
        if not kyc:
            raise NotFoundException(f"KYC records for seller profile #{seller_profile_id} not found")

        decision = action.decision.upper()
        if decision not in ("APPROVE", "REJECT", "REQUEST_REUPLOAD", "SUSPEND"):
            raise BadRequestException(f"Invalid review decision: {decision}")

        if decision in ("REJECT", "SUSPEND") and not action.reason:
            raise BadRequestException(f"Rejection or suspension reason is mandatory.")

        if decision == "REQUEST_REUPLOAD" and not action.reupload_notes:
            raise BadRequestException("Please specify which document requires re-upload.")

        prev_status = kyc.status
        now = datetime.datetime.now(datetime.timezone.utc)
        kyc.reviewed_at = now
        kyc.reviewer_id = admin_user.id
        kyc.rejection_reason = action.reason if decision in ("REJECT", "SUSPEND") else None
        kyc.reupload_notes = action.reupload_notes if decision == "REQUEST_REUPLOAD" else None

        if decision == "APPROVE":
            kyc.status = "VERIFIED"
            seller_profile.kyc_status = "VERIFIED"
            seller_profile.is_verified = True
            seller_profile.kyc_verified_at = now
            NotificationService.send_notification(
                db=db,
                user_id=seller_profile.user_id,
                notification_type="KYC_APPROVED",
                title="Shop Verification Approved!",
                message=f"Congratulations! Your shop '{seller_profile.business_name}' has been verified. Vegito Verified badge is now active on your store.",
            )
        elif decision == "REJECT":
            kyc.status = "REJECTED"
            seller_profile.kyc_status = "REJECTED"
            seller_profile.is_verified = False
            NotificationService.send_notification(
                db=db,
                user_id=seller_profile.user_id,
                notification_type="KYC_REJECTED",
                title="Shop Verification Rejected",
                message=f"Your shop verification application was rejected. Reason: {action.reason}",
            )
        elif decision == "REQUEST_REUPLOAD":
            kyc.status = "REUPLOAD_REQUIRED"
            seller_profile.kyc_status = "REUPLOAD_REQUIRED"
            seller_profile.is_verified = False
            NotificationService.send_notification(
                db=db,
                user_id=seller_profile.user_id,
                notification_type="KYC_REUPLOAD_REQUIRED",
                title="Document Re-upload Required",
                message=f"Attention: Please re-upload required documents for shop verification: {action.reupload_notes}",
            )
        elif decision == "SUSPEND":
            kyc.status = "SUSPENDED"
            seller_profile.kyc_status = "SUSPENDED"
            seller_profile.is_verified = False
            NotificationService.send_notification(
                db=db,
                user_id=seller_profile.user_id,
                notification_type="KYC_SUSPENDED",
                title="Shop Account Suspended",
                message=f"Your shop verification and active selling privileges have been suspended. Reason: {action.reason}",
            )

        audit = KycAudit(
            kyc_type="SELLER",
            target_id=seller_profile.id,
            user_id=seller_profile.user_id,
            reviewer_id=admin_user.id,
            previous_status=prev_status,
            new_status=kyc.status,
            decision=decision,
            reason=action.reason,
            reupload_notes=action.reupload_notes,
        )
        db.add(audit)
        db.commit()
        db.refresh(kyc)
        return kyc

    @staticmethod
    def admin_review_delivery(
        db: Session,
        admin_user: User,
        delivery_partner_id: int,
        action: KycReviewAction,
    ) -> DeliveryPartnerKyc:
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_partner_id).first()
        if not partner:
            raise NotFoundException(f"Delivery partner #{delivery_partner_id} not found")

        kyc = db.query(DeliveryPartnerKyc).filter(DeliveryPartnerKyc.delivery_partner_id == delivery_partner_id).first()
        if not kyc:
            raise NotFoundException(f"KYC records for delivery partner #{delivery_partner_id} not found")

        decision = action.decision.upper()
        if decision not in ("APPROVE", "REJECT", "REQUEST_REUPLOAD", "SUSPEND"):
            raise BadRequestException(f"Invalid review decision: {decision}")

        if decision in ("REJECT", "SUSPEND") and not action.reason:
            raise BadRequestException(f"Rejection or suspension reason is mandatory.")

        if decision == "REQUEST_REUPLOAD" and not action.reupload_notes:
            raise BadRequestException("Please specify which document requires re-upload.")

        prev_status = kyc.status
        now = datetime.datetime.now(datetime.timezone.utc)
        kyc.reviewed_at = now
        kyc.reviewer_id = admin_user.id
        kyc.rejection_reason = action.reason if decision in ("REJECT", "SUSPEND") else None
        kyc.reupload_notes = action.reupload_notes if decision == "REQUEST_REUPLOAD" else None

        if decision == "APPROVE":
            kyc.status = "VERIFIED"
            partner.kyc_status = "VERIFIED"
            partner.is_verified = True
            partner.kyc_verified_at = now
            NotificationService.send_notification(
                db=db,
                user_id=partner.user_id,
                notification_type="KYC_APPROVED",
                title="Delivery Partner Verification Approved!",
                message="Your delivery partner KYC verification is approved! You can now turn Online and receive delivery requests.",
            )
        elif decision == "REJECT":
            kyc.status = "REJECTED"
            partner.kyc_status = "REJECTED"
            partner.is_verified = False
            NotificationService.send_notification(
                db=db,
                user_id=partner.user_id,
                notification_type="KYC_REJECTED",
                title="Delivery Partner Verification Rejected",
                message=f"Your delivery partner verification was rejected. Reason: {action.reason}",
            )
        elif decision == "REQUEST_REUPLOAD":
            kyc.status = "REUPLOAD_REQUIRED"
            partner.kyc_status = "REUPLOAD_REQUIRED"
            partner.is_verified = False
            NotificationService.send_notification(
                db=db,
                user_id=partner.user_id,
                notification_type="KYC_REUPLOAD_REQUIRED",
                title="Document Re-upload Required",
                message=f"Please re-upload requested documents for delivery onboarding: {action.reupload_notes}",
            )
        elif decision == "SUSPEND":
            kyc.status = "SUSPENDED"
            partner.kyc_status = "SUSPENDED"
            partner.is_verified = False
            NotificationService.send_notification(
                db=db,
                user_id=partner.user_id,
                notification_type="KYC_SUSPENDED",
                title="Delivery Account Suspended",
                message=f"Your delivery partner account has been suspended. Reason: {action.reason}",
            )

        audit = KycAudit(
            kyc_type="DELIVERY_PARTNER",
            target_id=partner.id,
            user_id=partner.user_id,
            reviewer_id=admin_user.id,
            previous_status=prev_status,
            new_status=kyc.status,
            decision=decision,
            reason=action.reason,
            reupload_notes=action.reupload_notes,
        )
        db.add(audit)
        db.commit()
        db.refresh(kyc)
        return kyc

    # -----------------------------------------------------------------------
    # Admin List & Audits
    # -----------------------------------------------------------------------

    @staticmethod
    def list_pending_reviews(
        db: Session,
        kyc_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        sellers_query = db.query(SellerKyc)
        delivery_query = db.query(DeliveryPartnerKyc)

        if status:
            sellers_query = sellers_query.filter(SellerKyc.status == status.upper())
            delivery_query = delivery_query.filter(DeliveryPartnerKyc.status == status.upper())

        seller_list = []
        if not kyc_type or kyc_type.upper() == "SELLER":
            sellers = sellers_query.order_by(desc(SellerKyc.updated_at)).all()
            for s in sellers:
                prof = s.seller_profile
                seller_list.append({
                    "kyc_id": s.id,
                    "target_id": s.seller_profile_id,
                    "user_id": s.user_id,
                    "seller_name": prof.user.name if prof and prof.user else "Seller",
                    "business_name": prof.business_name if prof else "Shop",
                    "business_type": s.business_type,
                    "status": s.status,
                    "proof_type": s.business_proof_type,
                    "proof_number": s.business_proof_number,
                    "proof_file": s.business_proof_file,
                    "shop_front_photo": s.shop_front_photo,
                    "id_proof_type": s.id_proof_type,
                    "id_proof_number_masked": s.id_proof_number_masked,
                    "id_proof_file": s.id_proof_file,
                    "selfie_file": s.selfie_file,
                    "liveness_status": s.liveness_status,
                    "bank_account_holder": s.bank_account_holder,
                    "bank_account_number_masked": s.bank_account_number_masked,
                    "bank_ifsc": s.bank_ifsc,
                    "bank_upi_id": s.bank_upi_id,
                    "rejection_reason": s.rejection_reason,
                    "reupload_notes": s.reupload_notes,
                    "submitted_at": s.submitted_at,
                    "reviewed_at": s.reviewed_at,
                    "created_at": s.created_at,
                })

        delivery_list = []
        if not kyc_type or kyc_type.upper() in ("DELIVERY", "DELIVERY_PARTNER"):
            partners = delivery_query.order_by(desc(DeliveryPartnerKyc.updated_at)).all()
            for p in partners:
                partner_record = p.delivery_partner
                delivery_list.append({
                    "kyc_id": p.id,
                    "target_id": p.delivery_partner_id,
                    "user_id": p.user_id,
                    "full_name": p.full_name or (partner_record.user.name if partner_record and partner_record.user else "Partner"),
                    "status": p.status,
                    "driving_license_number": p.driving_license_number,
                    "driving_license_expiry": p.driving_license_expiry,
                    "driving_license_file": p.driving_license_file,
                    "vehicle_type": p.vehicle_type,
                    "vehicle_number": p.vehicle_number,
                    "rc_book_file": p.rc_book_file,
                    "insurance_file": p.insurance_file,
                    "profile_photo": p.profile_photo,
                    "selfie_file": p.selfie_file,
                    "liveness_status": p.liveness_status,
                    "id_proof_type": p.id_proof_type,
                    "id_proof_number_masked": p.id_proof_number_masked,
                    "id_proof_file": p.id_proof_file,
                    "operating_city": p.operating_city,
                    "bank_account_holder": p.bank_account_holder,
                    "bank_account_number_masked": p.bank_account_number_masked,
                    "bank_ifsc": p.bank_ifsc,
                    "bank_upi_id": p.bank_upi_id,
                    "rejection_reason": p.rejection_reason,
                    "reupload_notes": p.reupload_notes,
                    "submitted_at": p.submitted_at,
                    "reviewed_at": p.reviewed_at,
                    "created_at": p.created_at,
                })

        return {
            "sellers": seller_list,
            "delivery_partners": delivery_list,
            "total_pending": len([s for s in seller_list if s["status"] in ("UNDER_REVIEW", "SUBMITTED")])
            + len([p for p in delivery_list if p["status"] in ("UNDER_REVIEW", "SUBMITTED")]),
        }

    @staticmethod
    def get_audits(db: Session, target_id: Optional[int] = None, kyc_type: Optional[str] = None) -> List[KycAudit]:
        query = db.query(KycAudit)
        if target_id is not None:
            query = query.filter(KycAudit.target_id == target_id)
        if kyc_type:
            query = query.filter(KycAudit.kyc_type == kyc_type.upper())
        return query.order_by(desc(KycAudit.created_at)).limit(50).all()
