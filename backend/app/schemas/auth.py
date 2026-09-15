from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class SendOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit mobile number, e.g. 9876543210")


class SendOtpResponse(BaseModel):
    message: str
    phone: str
    dev_otp: Optional[str] = None  # Populated only if OTP_DEV_MODE is True


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit mobile number")
    otp: str = Field(..., min_length=4, max_length=6, description="OTP code received")
    name: Optional[str] = Field(None, max_length=100, description="Optional name for new users")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int
    role: str
    phone: str
    name: Optional[str] = None
    is_new_user: bool = False


class TokenPayload(BaseModel):
    sub: str  # user_id
    role: str
    phone: str
    exp: int
