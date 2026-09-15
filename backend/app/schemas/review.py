import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class ReviewCreate(BaseModel):
    order_id: int
    product_id: Optional[int] = None
    order_item_id: Optional[int] = None
    product_rating: Optional[int] = Field(None, ge=1, le=5)
    seller_rating: Optional[int] = Field(None, ge=1, le=5)
    delivery_rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


class ReviewRead(BaseSchema):
    id: int
    order_id: int
    order_item_id: Optional[int] = None
    customer_id: int
    seller_id: Optional[int] = None
    delivery_partner_id: Optional[int] = None
    product_id: Optional[int] = None
    product_rating: Optional[int] = None
    seller_rating: Optional[int] = None
    delivery_rating: Optional[int] = None
    comment: Optional[str] = None
    customer_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
