import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema
from app.schemas.user import UserRead


class CustomerProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    date_of_birth: Optional[datetime.date] = None
    profile_image_url: Optional[str] = None


class CustomerProfileRead(BaseSchema):
    id: int
    user_id: int
    date_of_birth: Optional[datetime.date] = None
    profile_image_url: Optional[str] = None
    total_orders: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    user: Optional[UserRead] = None


class DeliveryEligibilityRead(BaseSchema):
    is_eligible: bool
    distance_km: Optional[float] = None
    max_radius_km: float = 20.0
    seller_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_lat: Optional[float] = None
    seller_lng: Optional[float] = None
    seller_is_online: bool = True
    message: str
