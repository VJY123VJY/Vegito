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
