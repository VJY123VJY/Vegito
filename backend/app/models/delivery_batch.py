import datetime
from typing import Optional, List
from sqlalchemy import BigInteger, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeliveryBatch(Base):
    __tablename__ = "delivery_batches"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    delivery_partner_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("delivery_partners.id"), nullable=True, index=True
    )
    zone_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("delivery_zones.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(30), default="CREATED", nullable=False)
    total_orders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    delivery_partner: Mapped[Optional["DeliveryPartner"]] = relationship(
        "DeliveryPartner", back_populates="batches"
    )
    zone: Mapped[Optional["DeliveryZone"]] = relationship("DeliveryZone", back_populates="batches")
    batch_orders: Mapped[List["DeliveryBatchOrder"]] = relationship(
        "DeliveryBatchOrder", back_populates="batch", cascade="all, delete-orphan", order_by="DeliveryBatchOrder.sequence_number"
    )
