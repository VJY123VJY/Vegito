import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, model_validator
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

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        if self.latitude is not None and self.longitude is not None:
            if not self.latitude.is_finite() or not self.longitude.is_finite():
                raise ValueError("Coordinates must be finite numbers.")
            if not (-90 <= self.latitude <= 90 and -180 <= self.longitude <= 180):
                raise ValueError("Coordinates are outside valid latitude/longitude bounds.")
            if self.latitude == 0 and self.longitude == 0:
                raise ValueError("Coordinates must identify a real location.")
        return self


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

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        if self.latitude is not None and self.longitude is not None:
            if not self.latitude.is_finite() or not self.longitude.is_finite():
                raise ValueError("Coordinates must be finite numbers.")
            if not (-90 <= self.latitude <= 90 and -180 <= self.longitude <= 180):
                raise ValueError("Coordinates are outside valid latitude/longitude bounds.")
            if self.latitude == 0 and self.longitude == 0:
                raise ValueError("Coordinates must identify a real location.")
        return self


class AddressRead(BaseSchema, AddressBase):
    id: int
    user_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
