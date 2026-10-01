import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import BigInteger, String, Text, Numeric, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RecurringBulkOrder(Base):
    __tablename__ = "recurring_bulk_orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(30), default="DAILY", nullable=False)
    delivery_time_window: Mapped[str] = mapped_column(String(50), nullable=False)
    address_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("addresses.id", ondelete="RESTRICT"), nullable=False)
    seller_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    next_run_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    last_run_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    special_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    business: Mapped["BusinessProfile"] = relationship("BusinessProfile", back_populates="recurring_orders")
    address: Mapped["Address"] = relationship("Address")
    seller: Mapped[Optional["User"]] = relationship("User", foreign_keys=[seller_id])
    items: Mapped[List["RecurringBulkOrderItem"]] = relationship(
        "RecurringBulkOrderItem", back_populates="recurring_order", cascade="all, delete-orphan"
    )


class RecurringBulkOrderItem(Base):
    __tablename__ = "recurring_bulk_order_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    recurring_order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("recurring_bulk_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seller_product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), default="KG", nullable=False)

    # Relationships
    recurring_order: Mapped["RecurringBulkOrder"] = relationship("RecurringBulkOrder", back_populates="items")
    seller_product: Mapped["SellerProduct"] = relationship("SellerProduct")
