import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class NotificationBase(BaseModel):
    user_id: int
    notification_type: str = Field(..., max_length=50)
    title: str = Field(..., max_length=255)
    message: str
    channel: str = Field("IN_APP", max_length=30)  # IN_APP, SMS, WHATSAPP, PUSH, EMAIL


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(BaseSchema, NotificationBase):
    id: int
    is_sent: bool
    sent_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
