import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class CouponBase(BaseModel):
    code: str = Field(..., max_length=50)
    description: Optional[str] = None
    discount_type: str = Field(..., description="PERCENTAGE, FLAT")
    discount_value: Decimal = Field(..., gt=0)
    minimum_order_amount: Decimal = Field(Decimal("0.00"), ge=0)
    maximum_discount: Optional[Decimal] = None
    usage_limit: Optional[int] = None
    starts_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    minimum_order_amount: Optional[Decimal] = None
    maximum_discount: Optional[Decimal] = None
    usage_limit: Optional[int] = None
    starts_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    is_active: Optional[bool] = None


class CouponRead(BaseSchema, CouponBase):
    id: int
    used_count: int
    created_at: datetime.datetime


class ApplyCouponRequest(BaseModel):
    code: str
    order_amount: Decimal


class ApplyCouponResponse(BaseModel):
    is_valid: bool
    code: str
    discount_amount: Decimal
    final_amount: Decimal
    message: str
