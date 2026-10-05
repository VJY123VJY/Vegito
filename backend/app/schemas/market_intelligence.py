import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class MarketIntelligenceBase(BaseModel):
    product_id: int
    market: str = "Solapur APMC Mandi"
    district: str = "Solapur"
    state: str = "Maharashtra"
    reference_price: Decimal = Field(..., gt=0, description="Modal/Average APMC wholesale rate per unit")
    previous_price: Optional[Decimal] = None
    suggested_range_min: Decimal = Field(..., gt=0, description="Minimum reported rate")
    suggested_range_max: Decimal = Field(..., gt=0, description="Maximum reported rate")
    unit: str = "kg"
    trend: str = "STABLE"
    demand_signal: str = "NORMAL"
    supply_signal: str = "NORMAL"
    source: str = "MSAMB / Solapur APMC"
    source_url: Optional[str] = None
    confidence: Decimal = Decimal("1.00")
    market_date: Optional[datetime.date] = None

class MarketIntelligenceCreate(MarketIntelligenceBase):
    pass

class MarketIntelligenceUpdate(BaseModel):
    reference_price: Optional[Decimal] = None
    previous_price: Optional[Decimal] = None
    suggested_range_min: Optional[Decimal] = None
    suggested_range_max: Optional[Decimal] = None
    unit: Optional[str] = None
    trend: Optional[str] = None
    demand_signal: Optional[str] = None
    supply_signal: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    confidence: Optional[Decimal] = None
    market_date: Optional[datetime.date] = None

class MarketIntelligenceRead(BaseSchema, MarketIntelligenceBase):
    id: int
    product_name: Optional[str] = None
    timestamp: datetime.datetime

class PriceHistoryRead(BaseSchema):
    id: int
    seller_product_id: int
    price: Decimal
    created_at: datetime.datetime
