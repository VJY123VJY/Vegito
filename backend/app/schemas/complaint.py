import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class ComplaintCreate(BaseModel):
    order_id: int
    complaint_type: str = Field(..., max_length=50, description="QUALITY, MISSING_ITEM, LATE_DELIVERY, OTHER")
    description: str = Field(..., min_length=5)


class ComplaintUpdate(BaseModel):
    status: str = Field(..., description="OPEN, IN_PROGRESS, RESOLVED, CLOSED")
    resolution: Optional[str] = None


class ComplaintRead(BaseSchema):
    id: int
    order_id: int
    customer_id: int
    complaint_type: str
    description: str
    status: str
    resolution: Optional[str] = None
    resolved_by: Optional[int] = None
    created_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    customer_name: Optional[str] = None
