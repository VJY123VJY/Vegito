import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema
from app.schemas.category import CategoryRead


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
    category_id: Optional[int] = None
    name: str = Field(..., max_length=150)
    description: Optional[str] = None
    unit: str = Field(..., max_length=30)  # kg, 500g, bunch, piece
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=30)
    is_active: Optional[bool] = None


class ProductSellerOffer(BaseModel):
    seller_product_id: int
    seller_id: int
    seller_business_name: Optional[str] = None
    price: Decimal
    stock_quantity: Decimal
    minimum_order_quantity: Decimal
    is_available: bool


class ProductRead(BaseSchema, ProductBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    category: Optional[CategoryRead] = None
    images: List[ProductImageRead] = []
    # Dynamic price and stock from primary/best active seller offer
    min_price: Optional[Decimal] = None
    is_in_stock: bool = False
    seller_products: List[ProductSellerOffer] = []
