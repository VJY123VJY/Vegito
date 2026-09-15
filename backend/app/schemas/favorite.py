import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.common import BaseSchema
from app.schemas.product import ProductRead


class FavoriteAdd(BaseModel):
    product_id: int


class FavoriteRead(BaseSchema):
    id: int
    user_id: int
    product_id: int
    created_at: datetime.datetime
    product: Optional[ProductRead] = None
