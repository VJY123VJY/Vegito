import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeliveryTaskStatusHistory(Base):
    __tablename__ = "delivery_task_status_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    delivery_task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("delivery_tasks.id"), nullable=False, index=True
    )
    old_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    delivery_task: Mapped["DeliveryTask"] = relationship("DeliveryTask", back_populates="status_history")
    changer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[changed_by])
