from typing import Optional
from sqlalchemy import BigInteger, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeliveryBatchOrder(Base):
    __tablename__ = "delivery_batch_orders"
    __table_args__ = (
        UniqueConstraint("batch_id", "delivery_task_id", name="delivery_batch_orders_batch_id_delivery_task_id_key"),
        UniqueConstraint("batch_id", "sequence_number", name="delivery_batch_orders_batch_id_sequence_number_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("delivery_batches.id"), nullable=False, index=True
    )
    delivery_task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("delivery_tasks.id"), nullable=False, index=True
    )
    sequence_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    batch: Mapped["DeliveryBatch"] = relationship("DeliveryBatch", back_populates="batch_orders")
    delivery_task: Mapped["DeliveryTask"] = relationship("DeliveryTask", back_populates="batch_order")
