import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema
from app.schemas.product import ProductRead


class SellerProfileBase(BaseModel):
    business_name: str = Field(..., max_length=150)
    business_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    address_id: Optional[int] = None
    gst_number: Optional[str] = Field(None, max_length=30)


class SellerProfileCreate(SellerProfileBase):
    pass


class SellerProfileUpdate(BaseModel):
    business_name: Optional[str] = Field(None, max_length=150)
    business_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    address_id: Optional[int] = None
    gst_number: Optional[str] = Field(None, max_length=30)


class SellerProfileRead(BaseSchema, SellerProfileBase):
    id: int
    user_id: int
    is_verified: bool
    rating: Decimal
    total_orders: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


class SellerProductBase(BaseModel):
    product_id: int
    price: Decimal = Field(..., gt=0, description="Price per unit")
    stock_quantity: Decimal = Field(Decimal("0.000"), ge=0)
    minimum_order_quantity: Decimal = Field(Decimal("1.000"), gt=0)
    is_available: bool = True


class SellerProductCreate(SellerProductBase):
    pass


class SellerProductUpdate(BaseModel):
    price: Optional[Decimal] = Field(None, gt=0)
    stock_quantity: Optional[Decimal] = Field(None, ge=0)
    minimum_order_quantity: Optional[Decimal] = Field(None, gt=0)
    is_available: Optional[bool] = None


class SellerProductRead(BaseSchema, SellerProductBase):
    id: int
    seller_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    product: Optional[ProductRead] = None
