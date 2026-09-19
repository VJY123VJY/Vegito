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


class VerifyPickupOtpRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=10, description="Pickup OTP given by seller or displayed in dashboard")


class DeliveryTaskRead(BaseSchema):
    id: int
    order_id: int
    order_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[AddressRead] = None
    delivery_partner_id: Optional[int] = None
    status: str
    order_status: Optional[str] = None
    pickup_otp: Optional[str] = None
    pickup_otp_verified_at: Optional[datetime.datetime] = None
    shop_name: Optional[str] = None
    shop_address: Optional[str] = None
    shop_latitude: Optional[Decimal] = None
    shop_longitude: Optional[Decimal] = None
    customer_latitude: Optional[Decimal] = None
    customer_longitude: Optional[Decimal] = None
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
    tasks: List[DeliveryTaskRead] = []


class DeliveryPartnerProfileRead(BaseSchema):
    id: int
    user_id: int
    name: str
    email: str
    phone: str
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    is_available: bool = True
    is_verified: bool = False
    rating: Decimal = Decimal("0.00")
    total_deliveries: int = 0
    created_at: datetime.datetime


class DeliveryPartnerProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    is_available: Optional[bool] = None


class DeliveryPartnerAvailabilityUpdate(BaseModel):
    is_available: bool

