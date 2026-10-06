from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import BaseSchema


class SendOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit mobile number, e.g. 9876543210")


class SendOtpResponse(BaseModel):
    message: str
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit mobile number")
    otp: str = Field(..., min_length=4, max_length=6, description="OTP code received")
    name: Optional[str] = Field(None, max_length=100, description="Optional name for new users")
    role: Optional[str] = Field(None, description="Optional expected role context, e.g. SELLER, DELIVERY_PARTNER")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int
    role: str
    phone: str
    name: Optional[str] = None
    is_new_user: bool = False
    authorized_roles: list[str] = Field(default_factory=list, description="All roles this user is authorized to access")


class SwitchWorkspaceRequest(BaseModel):
    target_role: Literal["CUSTOMER", "SELLER", "DELIVERY_PARTNER"] = Field(
        ..., description="Authorized workspace role to switch to"
    )


class TokenPayload(BaseModel):
    sub: str  # user_id
    role: str
    phone: str
    exp: int


class CustomerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., description="10-digit mobile number")
    password: Optional[str] = Field(None, min_length=4, max_length=128)
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Solapur"
    pincode: Optional[str] = "413001"


class SellerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., description="10-digit mobile number")
    password: Optional[str] = Field(None, min_length=4, max_length=128)
    email: Optional[str] = None
    business_name: str = Field(..., min_length=2, max_length=150)
    business_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = "Solapur"
    pincode: Optional[str] = "413001"
    gst_number: Optional[str] = None
    description: Optional[str] = None

    @model_validator(mode="after")
    def require_valid_shop_location(self):
        if self.latitude is None or self.longitude is None:
            raise ValueError("A real shop latitude and longitude are required to register a seller.")
        if not (-90 <= self.latitude <= 90 and -180 <= self.longitude <= 180):
            raise ValueError("Shop coordinates are outside valid latitude/longitude bounds.")
        if self.latitude == 0 and self.longitude == 0:
            raise ValueError("Shop coordinates must identify a real location.")
        return self


class DeliveryPartnerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., description="10-digit mobile number")
    password: Optional[str] = Field(None, min_length=4, max_length=128)
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Solapur"
    pincode: Optional[str] = "413001"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    vehicle_type: Optional[str] = "Motorcycle"
    vehicle_number: Optional[str] = None


class PasswordLoginRequest(BaseModel):
    phone: str = Field(..., description="10-digit mobile number, e.g. 9876543210")
    password: str = Field(..., min_length=1, max_length=128, description="User password")
    role: Optional[str] = Field(None, description="Expected role, e.g. CUSTOMER, SELLER, DELIVERY_PARTNER, ADMIN")


class UnifiedRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., description="10-digit mobile number")
    password: str = Field(..., min_length=4, max_length=128)
    # Privileged roles are intentionally excluded from public registration.
    role: Literal["CUSTOMER", "SELLER", "DELIVERY_PARTNER", "DELIVERY"] = Field(
        ..., description="CUSTOMER, SELLER, or DELIVERY_PARTNER"
    )
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Solapur"
    pincode: Optional[str] = "413001"
    business_name: Optional[str] = None
    business_address: Optional[str] = None
    gst_number: Optional[str] = None
    description: Optional[str] = None
    vehicle_type: Optional[str] = "Motorcycle"
    vehicle_number: Optional[str] = None


class RegisterResponse(BaseModel):
    message: str
    user_id: int
    phone: str
    role: str
