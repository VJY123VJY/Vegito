import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import BaseSchema
from app.schemas.product import ProductRead


class SellerProfileBase(BaseModel):
    business_name: str = Field(..., max_length=150)
    business_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    address_id: Optional[int] = None
    address: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    gst_number: Optional[str] = Field(None, max_length=30)


class SellerProfileCreate(SellerProfileBase):
    pass


class SellerProfileUpdate(BaseModel):
    business_name: Optional[str] = Field(None, max_length=150)
    business_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    address_id: Optional[int] = None
    address: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    gst_number: Optional[str] = Field(None, max_length=30)
    is_available: Optional[bool] = None

    @model_validator(mode="after")
    def validate_location_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        if self.latitude is not None and self.longitude is not None:
            if not self.latitude.is_finite() or not self.longitude.is_finite():
                raise ValueError("Shop coordinates must be finite numbers.")
            if not (-90 <= self.latitude <= 90 and -180 <= self.longitude <= 180):
                raise ValueError("Shop coordinates are outside valid latitude/longitude bounds.")
            if self.latitude == 0 and self.longitude == 0:
                raise ValueError("Shop coordinates must identify a real location.")
        return self


class SellerAvailabilityUpdate(BaseModel):
    is_available: bool


class SellerProfileRead(BaseSchema, SellerProfileBase):
    id: int
    user_id: int
    is_verified: bool
    is_available: bool = True
    rating: Decimal
    total_orders: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


from app.schemas.freshness import FreshnessInfo


class SellerProductBase(BaseModel):
    product_id: Optional[int] = None
    price: Decimal = Field(..., gt=0, description="Price per unit")
    stock_quantity: Decimal = Field(Decimal("0.000"), ge=0)
    minimum_order_quantity: Decimal = Field(Decimal("1.000"), gt=0)
    is_available: bool = True
    added_date: Optional[datetime.date] = None
    added_time: Optional[datetime.time] = None
    harvest_date: Optional[datetime.date] = None
    harvest_time: Optional[datetime.time] = None
    storage_condition: Optional[str] = None
    origin: Optional[str] = None


class SellerProductCreate(SellerProductBase):
    product_name: Optional[str] = None
    product_type: Optional[str] = None
    category_id: Optional[int] = None
    unit: Optional[str] = "1 KG"
    description: Optional[str] = None
    image_url: Optional[str] = None


class SellerProductUpdate(BaseModel):
    price: Optional[Decimal] = Field(None, gt=0)
    stock_quantity: Optional[Decimal] = Field(None, ge=0)
    minimum_order_quantity: Optional[Decimal] = Field(None, gt=0)
    is_available: Optional[bool] = None
    added_date: Optional[datetime.date] = None
    added_time: Optional[datetime.time] = None
    harvest_date: Optional[datetime.date] = None
    harvest_time: Optional[datetime.time] = None
    storage_condition: Optional[str] = None
    origin: Optional[str] = None


class SellerProductRead(BaseSchema, SellerProductBase):
    id: int
    seller_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    product: Optional[ProductRead] = None
    freshness: Optional[FreshnessInfo] = None
