import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    display_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class CategoryRead(BaseSchema, CategoryBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
