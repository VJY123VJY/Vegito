import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class ProductReviewItem(BaseModel):
    product_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewCreate(BaseModel):
    order_id: int
    target_type: Optional[str] = None  # "SELLER", "DELIVERY_PARTNER", "PRODUCT", or None/ALL
    rating: Optional[int] = Field(None, ge=1, le=5)
    product_id: Optional[int] = None
    order_item_id: Optional[int] = None
    product_rating: Optional[int] = Field(None, ge=1, le=5)
    seller_rating: Optional[int] = Field(None, ge=1, le=5)
    delivery_rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    seller_comment: Optional[str] = None
    delivery_comment: Optional[str] = None
    product_reviews: Optional[List[ProductReviewItem]] = None


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
    product_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class OrderReviewStatusRead(BaseModel):
    order_id: int
    is_delivered: bool
    has_reviewed: bool
    has_reviewed_seller: bool
    has_reviewed_delivery: bool
    seller_rating: Optional[int] = None
    seller_comment: Optional[str] = None
    delivery_rating: Optional[int] = None
    delivery_comment: Optional[str] = None
    reviewed_product_ids: List[int] = []
    seller_name: Optional[str] = None
    delivery_partner_name: Optional[str] = None
    reviews: List[ReviewRead] = []


class EntityReviewSummary(BaseModel):
    average_rating: float
    total_reviews: int
    reviews: List[ReviewRead] = []


class ReviewConfigRead(BaseModel):
    google_review_url: str

