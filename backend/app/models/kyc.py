import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SellerKyc(Base):
    __tablename__ = "seller_kyc"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seller_profile_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("seller_profiles.id"), unique=True, nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False, index=True)

    # Business Information
    business_type: Mapped[str] = mapped_column(String(50), default="RETAIL_STORE", nullable=False)
    business_proof_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    business_proof_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    business_proof_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Shop Photographs
    shop_front_photo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    shop_interior_photo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    shop_signage_photo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Identity Verification
    id_proof_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_proof_number_masked: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    id_proof_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Selfie & Liveness (Real verification interface - status is PENDING_VERIFICATION)
    selfie_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    liveness_status: Mapped[str] = mapped_column(String(50), default="PENDING_VERIFICATION", nullable=False)

    # Bank / Payout Information
    bank_account_holder: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_account_number_masked: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_ifsc: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_upi_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Review Decisions
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reupload_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    reviewed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    reviewer_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    seller_profile: Mapped["SellerProfile"] = relationship("SellerProfile", back_populates="kyc")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewer_id])


class DeliveryPartnerKyc(Base):
    __tablename__ = "delivery_partner_kyc"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    delivery_partner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("delivery_partners.id"), unique=True, nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False, index=True)

    # Personal Details
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Selfie & Liveness
    profile_photo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    selfie_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    liveness_status: Mapped[str] = mapped_column(String(50), default="PENDING_VERIFICATION", nullable=False)

    # Identity Verification
    id_proof_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_proof_number_masked: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    id_proof_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Driving Licence
    driving_license_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    driving_license_expiry: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    driving_license_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Vehicle Information
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(50), default="Motorcycle", nullable=True)
    vehicle_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    rc_book_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    insurance_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Operating Location
    operating_city: Mapped[str] = mapped_column(String(100), default="Solapur", nullable=False)
    operating_zone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Bank / Payout Information
    bank_account_holder: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_account_number_masked: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_ifsc: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_upi_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Review Decisions
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reupload_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    reviewed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    reviewer_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    delivery_partner: Mapped["DeliveryPartner"] = relationship("DeliveryPartner", back_populates="kyc")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewer_id])


class KycAudit(Base):
    __tablename__ = "kyc_audits"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    kyc_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # SELLER or DELIVERY_PARTNER
    target_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)  # profile or partner id
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    reviewer_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False)  # SUBMIT, APPROVE, REJECT, REQUEST_REUPLOAD, SUSPEND
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reupload_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewer_id])
