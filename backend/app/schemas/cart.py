import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class CartItemAdd(BaseModel):
    seller_product_id: int
    quantity: Decimal = Field(..., gt=0, description="Quantity to add")


class CartItemUpdate(BaseModel):
    quantity: Decimal = Field(..., gt=0, description="New quantity")


class CartItemRead(BaseSchema):
    id: int
    cart_id: int
    seller_product_id: int
    product_id: int
    product_name: str
    unit: str
    image_url: Optional[str] = None
    price_per_unit: Decimal
    quantity: Decimal
    item_total: Decimal
    is_available: bool
    stock_available: Decimal
    created_at: datetime.datetime
    updated_at: datetime.datetime


class CartRead(BaseSchema):
    id: int
    user_id: int
    items: List[CartItemRead] = []
    total_items_count: int = 0
    subtotal: Decimal = Decimal("0.00")
    delivery_charge: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    total_amount: Decimal = Decimal("0.00")
