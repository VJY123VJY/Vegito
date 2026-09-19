import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema
from app.schemas.product import ProductRead

class PromotionItemBase(BaseModel):
    seller_product_id: int
    quantity: Decimal = Field(Decimal("1.000"), gt=0)

class PromotionItemRead(BaseSchema, PromotionItemBase):
    id: int
    promotion_id: int
    product_name: Optional[str] = None
    unit: Optional[str] = None

class PromotionBase(BaseModel):
    title: str = Field(..., max_length=150)
    description: Optional[str] = None
    type: str = "BUNDLE"
    price: Decimal = Field(..., gt=0)
    is_repeat_only: bool = False
    min_order_count: int = 0
    period_days: int = 30
    status: str = "ACTIVE"
    starts_at: Optional[datetime.datetime] = None
    ends_at: Optional[datetime.datetime] = None

class PromotionCreate(PromotionBase):
    items: List[PromotionItemBase]

class PromotionRead(BaseSchema, PromotionBase):
    id: int
    seller_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    items: List[PromotionItemRead] = []
    eligible: bool = True  # Calculated for the current user
