import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class DeliveryLocationCreate(BaseModel):
    latitude: Decimal = Field(..., description="Latitude coordinate")
    longitude: Decimal = Field(..., description="Longitude coordinate")
    accuracy_meters: Optional[Decimal] = Field(None, ge=0, description="Accuracy in meters")
    heading: Optional[Decimal] = Field(None, ge=0, le=360, description="Heading in degrees (0-360)")
    speed_kmh: Optional[Decimal] = Field(None, ge=0, description="Speed in km/h")


class DeliveryLocationRead(BaseSchema):
    id: int
    delivery_partner_id: int
    latitude: Decimal
    longitude: Decimal
    accuracy_meters: Optional[Decimal] = None
    heading: Optional[Decimal] = None
    speed_kmh: Optional[Decimal] = None
    recorded_at: datetime.datetime


class LivePartnerLocationRead(BaseModel):
    partner_id: int
    user_id: int
    partner_name: str
    phone: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    is_available: bool = True
    is_verified: bool = False
    rating: Decimal = Decimal("0.00")
    total_deliveries: int = 0
    status: str = "AVAILABLE"  # ONLINE, OFFLINE, BUSY, AVAILABLE
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    accuracy_meters: Optional[Decimal] = None
    heading: Optional[Decimal] = None
    speed_kmh: Optional[Decimal] = None
    recorded_at: Optional[datetime.datetime] = None
    active_task_id: Optional[int] = None
    active_order_id: Optional[int] = None
    active_order_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    customer_latitude: Optional[Decimal] = None
    customer_longitude: Optional[Decimal] = None
