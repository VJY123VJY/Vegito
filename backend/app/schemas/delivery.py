import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema
from app.schemas.address import AddressRead


class DeliveryZoneBase(BaseModel):
    name: str = Field(..., max_length=100)
    city: str = Field(..., max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    delivery_charge: Decimal = Field(Decimal("0.00"), ge=0)
    minimum_order_amount: Decimal = Field(Decimal("0.00"), ge=0)
    is_active: bool = True


class DeliveryZoneCreate(DeliveryZoneBase):
    pass


class DeliveryZoneRead(BaseSchema, DeliveryZoneBase):
    id: int
    created_at: datetime.datetime


class DeliveryPartnerBase(BaseModel):
    vehicle_type: Optional[str] = Field(None, max_length=50)
    vehicle_number: Optional[str] = Field(None, max_length=30)
    is_available: bool = True


class DeliveryPartnerRead(BaseSchema, DeliveryPartnerBase):
    id: int
    user_id: int
    is_verified: bool
    rating: Decimal
    total_deliveries: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


class DeliveryTaskStatusUpdate(BaseModel):
    status: str = Field(..., description="ASSIGNED, STARTED, DELIVERED, FAILED, CANCELLED")
    note: Optional[str] = None


class DeliveryOtpVerifyRequest(BaseModel):
    delivery_otp: str = Field(..., min_length=4, max_length=6, description="OTP given by customer")
    notes: Optional[str] = None


class DeliveryTaskRead(BaseSchema):
    id: int
    order_id: int
    order_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[AddressRead] = None
    delivery_partner_id: Optional[int] = None
    status: str
    assigned_at: Optional[datetime.datetime] = None
    started_at: Optional[datetime.datetime] = None
    delivered_at: Optional[datetime.datetime] = None
    delivery_otp_verified_at: Optional[datetime.datetime] = None
    notes: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class DeliveryBatchCreate(BaseModel):
    zone_id: Optional[int] = None
    delivery_partner_id: Optional[int] = None
    task_ids: List[int] = []


class DeliveryBatchRead(BaseSchema):
    id: int
    delivery_partner_id: Optional[int] = None
    zone_id: Optional[int] = None
    status: str
    total_orders: int
    started_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    tasks: List[DeliveryTaskRead] = []
