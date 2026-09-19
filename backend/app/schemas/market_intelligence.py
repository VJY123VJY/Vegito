import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from app.schemas.common import BaseSchema
from app.schemas.product import ProductRead

class MarketIntelligenceRead(BaseSchema):
    id: int
    product_id: int
    reference_price: Decimal
    previous_price: Optional[Decimal] = None
    trend: str
    suggested_range_min: Decimal
    suggested_range_max: Decimal
    demand_signal: str
    supply_signal: str
    source: str
    confidence: Decimal
    timestamp: datetime.datetime
    product: Optional[ProductRead] = None

class PriceHistoryRead(BaseSchema):
    id: int
    seller_product_id: int
    price: Decimal
    created_at: datetime.datetime
