import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class AddressBase(BaseModel):
    address_line1: str = Field(..., max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    landmark: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., max_length=100)
    state: str = Field(..., max_length=100)
    country: str = Field("India", max_length=100)
    pincode: str = Field(..., max_length=10)
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    address_type: Optional[str] = Field("HOME", max_length=30)
    is_default: bool = False


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    address_line1: Optional[str] = Field(None, max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    landmark: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    address_type: Optional[str] = Field(None, max_length=30)
    is_default: Optional[bool] = None


class AddressRead(BaseSchema, AddressBase):
    id: int
    user_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
