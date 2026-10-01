import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import BaseSchema
from app.schemas.category import CategoryRead
from app.schemas.freshness import FreshnessInfo


class ProductImageBase(BaseModel):
    image_url: str
    is_primary: bool = False
    display_order: int = 0


class ProductImageCreate(ProductImageBase):
    pass


class ProductImageRead(BaseSchema, ProductImageBase):
    id: int
    product_id: int
    created_at: datetime.datetime


class ProductBase(BaseModel):
    name: str = Field(..., max_length=150)
    category_id: int
    description: Optional[str] = None
    unit: str = Field("1 KG", max_length=30)
    shelf_life_days: Optional[int] = 7
    freshness_category: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    category_id: Optional[int] = None
    description: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=30)
    shelf_life_days: Optional[int] = None
    freshness_category: Optional[str] = None
    is_active: Optional[bool] = None


class ProductSellerOffer(BaseModel):
    seller_product_id: int
    seller_id: int
    seller_business_name: Optional[str] = None
    seller_rating: Optional[Decimal] = None
    price: Decimal
    stock_quantity: Decimal
    minimum_order_quantity: Decimal
    is_available: bool
    added_date: Optional[datetime.date] = None
    added_time: Optional[datetime.time] = None
    harvest_date: Optional[datetime.date] = None
    harvest_time: Optional[datetime.time] = None
    storage_condition: Optional[str] = None
    origin: Optional[str] = None
    freshness: Optional[FreshnessInfo] = None

    @model_validator(mode="before")
    @classmethod
    def from_seller_product_model(cls, data):
        if hasattr(data, "id") and hasattr(data, "seller_id"):
            seller = getattr(data, "seller", None)
            profile = getattr(seller, "seller_profile", None) if seller else None
            return {
                "seller_product_id": data.id,
                "seller_id": data.seller_id,
                "seller_business_name": getattr(profile, "business_name", None) if profile else None,
                "seller_rating": getattr(profile, "rating", None) if profile else None,
                "price": data.price,
                "stock_quantity": data.stock_quantity,
                "minimum_order_quantity": data.minimum_order_quantity,
                "is_available": data.is_available,
                "added_date": getattr(data, "added_date", None),
                "added_time": getattr(data, "added_time", None),
                "harvest_date": getattr(data, "harvest_date", None),
                "harvest_time": getattr(data, "harvest_time", None),
                "storage_condition": getattr(data, "storage_condition", None),
                "origin": getattr(data, "origin", None),
            }
        return data



class ProductRead(BaseSchema, ProductBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    category: Optional[CategoryRead] = None
    images: List[ProductImageRead] = []
    # Dynamic price and stock from primary/best active seller offer
    min_price: Optional[Decimal] = None
    is_in_stock: bool = False
    freshness: Optional[FreshnessInfo] = None
    seller_products: List[ProductSellerOffer] = []
