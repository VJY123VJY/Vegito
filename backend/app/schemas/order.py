import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema
from app.schemas.address import AddressRead


class OrderCreate(BaseModel):
    address_id: int
    payment_method: str = Field("COD", description="COD, UPI, etc.")
    coupon_code: Optional[str] = None
    delivery_slot_start: Optional[datetime.datetime] = None
    delivery_slot_end: Optional[datetime.datetime] = None
    customer_note: Optional[str] = None


class OrderItemRead(BaseSchema):
    id: int
    order_id: int
    seller_product_id: Optional[int] = None
    product_name: str
    unit: str
    quantity: Decimal
    unit_price: Decimal
    subtotal: Decimal
    created_at: datetime.datetime


class OrderStatusHistoryRead(BaseSchema):
    id: int
    order_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_by: Optional[int] = None
    note: Optional[str] = None
    created_at: datetime.datetime


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="NEW, ACCEPTED, PACKING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REJECTED")
    note: Optional[str] = None


class OrderRead(BaseSchema):
    id: int
    order_number: str
    customer_id: int
    address_id: int
    status: str
    payment_method: str
    payment_status: str
    subtotal: Decimal
    delivery_charge: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    delivery_slot_start: Optional[datetime.datetime] = None
    delivery_slot_end: Optional[datetime.datetime] = None
    customer_note: Optional[str] = None
    placed_at: datetime.datetime
    accepted_at: Optional[datetime.datetime] = None
    packed_at: Optional[datetime.datetime] = None
    ready_at: Optional[datetime.datetime] = None
    out_for_delivery_at: Optional[datetime.datetime] = None
    delivered_at: Optional[datetime.datetime] = None
    cancelled_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    items_count: Optional[int] = None


class OrderDetailRead(OrderRead):
    address: Optional[AddressRead] = None
    items: List[OrderItemRead] = []
    status_history: List[OrderStatusHistoryRead] = []
    delivery_otp: Optional[str] = None  # Returned to customer for their delivery verification
