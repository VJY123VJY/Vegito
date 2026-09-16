import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class SellerOrderFulfillmentRead(BaseSchema):
    id: int
    order_id: int
    seller_id: int
    status: str
    subtotal: Decimal
    seller_amount: Decimal
    accepted_at: Optional[datetime.datetime] = None
    packed_at: Optional[datetime.datetime] = None
    ready_at: Optional[datetime.datetime] = None
    rejected_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    business_name: Optional[str] = None


class SellerOrderFulfillmentUpdate(BaseModel):
    status: str = Field(..., description="ACCEPTED, PACKING, READY, REJECTED")
    note: Optional[str] = None
