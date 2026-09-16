import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, String, Numeric, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SellerOrderFulfillment(Base):
    __tablename__ = "order_seller_fulfillments"
    __table_args__ = (
        Index("ix_order_seller_fulfillments_order_seller", "order_id", "seller_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="NEW", nullable=False, index=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    seller_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    accepted_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    packed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    ready_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    rejected_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="seller_fulfillments")
    seller: Mapped["User"] = relationship("User", foreign_keys=[seller_id])
