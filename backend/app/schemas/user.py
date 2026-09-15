import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import BaseSchema


class UserBase(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: str


class UserRead(BaseSchema, UserBase):
    id: int
    role_id: int
    role_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)


class UserStatusUpdate(BaseModel):
    is_active: bool
