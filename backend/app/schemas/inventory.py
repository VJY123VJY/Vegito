import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class InventoryUpdate(BaseModel):
    quantity_change: Decimal = Field(..., description="Quantity to add (positive) or deduct (negative)")
    transaction_type: str = Field("ADJUSTMENT", description="STOCK_IN, STOCK_OUT, ADJUSTMENT")
    note: Optional[str] = None


class InventoryRead(BaseSchema):
    id: int
    seller_product_id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    unit: Optional[str] = None
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal
    low_stock_threshold: Decimal
    is_low_stock: bool
    updated_at: datetime.datetime


class InventoryTransactionRead(BaseSchema):
    id: int
    inventory_id: int
    transaction_type: str
    quantity: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    note: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime.datetime
