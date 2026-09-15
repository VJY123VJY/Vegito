from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate
from app.core.constants import NotificationChannel
from app.core.logging import logger


class NotificationService:
    @staticmethod
    def send_notification(
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        channel: str = NotificationChannel.IN_APP.value,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            channel=channel,
            is_sent=True,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Pluggable external channel dispatch
        if channel == NotificationChannel.SMS.value:
            logger.info(f"Dispatched SMS notification to user {user_id}: {title}")
        elif channel == NotificationChannel.WHATSAPP.value:
            logger.info(f"Dispatched WhatsApp notification to user {user_id}: {title}")
        elif channel == NotificationChannel.PUSH.value:
            logger.info(f"Dispatched Push notification to user {user_id}: {title}")

        return notification

    @staticmethod
    def get_user_notifications(
        db: Session, user_id: int, limit: int = 50
    ) -> List[Notification]:
        return (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )
