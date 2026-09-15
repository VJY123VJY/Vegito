import datetime
from typing import Optional, List
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeliveryTask(Base):
    __tablename__ = "delivery_tasks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id"), unique=True, nullable=False)
    delivery_partner_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("delivery_partners.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(30), default="ASSIGNED", nullable=False, index=True)
    assigned_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    delivery_otp_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivery_otp_verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="delivery_task")
    delivery_partner: Mapped[Optional["DeliveryPartner"]] = relationship(
        "DeliveryPartner", back_populates="tasks"
    )
    status_history: Mapped[List["DeliveryTaskStatusHistory"]] = relationship(
        "DeliveryTaskStatusHistory",
        back_populates="delivery_task",
        cascade="all, delete-orphan",
        order_by="DeliveryTaskStatusHistory.created_at",
    )
    batch_order: Mapped[Optional["DeliveryBatchOrder"]] = relationship(
        "DeliveryBatchOrder", back_populates="delivery_task", uselist=False
    )
