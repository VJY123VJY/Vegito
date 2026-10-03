import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class SellerKycSubmit(BaseModel):
    business_type: str = Field("RETAIL_STORE", description="RETAIL_STORE, WHOLESALE_MANDI, FARMER_PRODUCER, HOME_KITCHEN, ORGANIC_FARM, OTHER")
    business_proof_type: Optional[str] = Field(None, description="GST_CERTIFICATE, SHOP_ESTABLISHMENT_LICENSE, TRADE_LICENSE, APMC_MANDI_LICENSE, BUSINESS_ADDRESS_PROOF, ELECTRICITY_BILL_PREMISES, RENT_AGREEMENT, OTHER")
    business_proof_number: Optional[str] = None
    business_proof_file: Optional[str] = None

    shop_front_photo: Optional[str] = None
    shop_interior_photo: Optional[str] = None
    shop_signage_photo: Optional[str] = None

    id_proof_type: Optional[str] = Field(None, description="PAN, AADHAAR, DRIVING_LICENSE, VOTER_ID, PASSPORT")
    id_proof_number: Optional[str] = None
    id_proof_file: Optional[str] = None

    selfie_file: Optional[str] = None

    bank_account_holder: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    bank_upi_id: Optional[str] = None


class SellerKycRead(BaseSchema):
    id: int
    seller_profile_id: int
    user_id: int
    status: str
    business_type: str
    business_proof_type: Optional[str] = None
    business_proof_number: Optional[str] = None
    business_proof_file: Optional[str] = None
    shop_front_photo: Optional[str] = None
    shop_interior_photo: Optional[str] = None
    shop_signage_photo: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number_masked: Optional[str] = None
    id_proof_file: Optional[str] = None
    selfie_file: Optional[str] = None
    liveness_status: str
    bank_account_holder: Optional[str] = None
    bank_account_number_masked: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    bank_upi_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    reupload_notes: Optional[str] = None
    submitted_at: Optional[datetime.datetime] = None
    reviewed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class DeliveryPartnerKycSubmit(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    profile_photo: Optional[str] = None
    selfie_file: Optional[str] = None

    id_proof_type: Optional[str] = Field(None, description="AADHAAR, PAN, VOTER_ID, PASSPORT")
    id_proof_number: Optional[str] = None
    id_proof_file: Optional[str] = None

    driving_license_number: Optional[str] = None
    driving_license_expiry: Optional[str] = None
    driving_license_file: Optional[str] = None

    vehicle_type: Optional[str] = "Motorcycle"
    vehicle_number: Optional[str] = None
    rc_book_file: Optional[str] = None
    insurance_file: Optional[str] = None

    operating_city: Optional[str] = "Solapur"
    operating_zone: Optional[str] = None

    bank_account_holder: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_upi_id: Optional[str] = None


class DeliveryPartnerKycRead(BaseSchema):
    id: int
    delivery_partner_id: int
    user_id: int
    status: str
    full_name: Optional[str] = None
    dob: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    profile_photo: Optional[str] = None
    selfie_file: Optional[str] = None
    liveness_status: str
    id_proof_type: Optional[str] = None
    id_proof_number_masked: Optional[str] = None
    id_proof_file: Optional[str] = None
    driving_license_number: Optional[str] = None
    driving_license_expiry: Optional[str] = None
    driving_license_file: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    rc_book_file: Optional[str] = None
    insurance_file: Optional[str] = None
    operating_city: str
    operating_zone: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_account_number_masked: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_upi_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    reupload_notes: Optional[str] = None
    submitted_at: Optional[datetime.datetime] = None
    reviewed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class KycReviewAction(BaseModel):
    decision: str = Field(..., description="APPROVE, REJECT, REQUEST_REUPLOAD, SUSPEND")
    reason: Optional[str] = Field(None, description="Required for REJECT and SUSPEND")
    reupload_notes: Optional[str] = Field(None, description="Required for REQUEST_REUPLOAD to specify which doc needs correction")


class KycAuditRead(BaseSchema):
    id: int
    kyc_type: str
    target_id: int
    user_id: int
    reviewer_id: Optional[int] = None
    previous_status: Optional[str] = None
    new_status: str
    decision: str
    reason: Optional[str] = None
    reupload_notes: Optional[str] = None
    created_at: datetime.datetime
