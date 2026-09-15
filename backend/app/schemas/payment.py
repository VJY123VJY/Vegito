import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class PaymentCreate(BaseModel):
    order_id: int
    payment_method: str = Field("COD", description="COD, UPI, CARD, etc.")
    payment_provider: Optional[str] = "mock"


class PaymentVerify(BaseModel):
    order_id: int
    provider_payment_id: str
    provider_order_id: Optional[str] = None
    signature: Optional[str] = None


class PaymentRead(BaseSchema):
    id: int
    order_id: int
    payment_provider: Optional[str] = None
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    amount: Decimal
    currency: str
    status: str
    payment_method: Optional[str] = None
    paid_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
