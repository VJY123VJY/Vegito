from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.notification import NotificationRead, NotificationCreate
from app.schemas.common import APIResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=APIResponse[List[NotificationRead]], summary="Get current user notifications")
def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications = NotificationService.get_user_notifications(db, current_user.id, limit=limit)
    return APIResponse(data=[NotificationRead.model_validate(n) for n in notifications])


@router.post("", response_model=APIResponse[NotificationRead], status_code=status.HTTP_201_CREATED, summary="Send notification to user (Admin)")
def send_notification(
    payload: NotificationCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notif = NotificationService.send_notification(
        db=db,
        user_id=payload.user_id,
        notification_type=payload.notification_type,
        title=payload.title,
        message=payload.message,
        channel=payload.channel,
    )
    return APIResponse(message="Notification sent successfully", data=NotificationRead.model_validate(notif))
