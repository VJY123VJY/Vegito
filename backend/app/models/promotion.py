import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import BigInteger, String, Text, Numeric, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seller_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(30), default="BUNDLE")  # BUNDLE, FIXED_PRICE, DISCOUNT
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Repeat customer rules
    is_repeat_only: Mapped[bool] = mapped_column(Boolean, default=False)
    min_order_count: Mapped[int] = mapped_column(Integer, default=0)
    period_days: Mapped[int] = mapped_column(Integer, default=30)

    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")  # ACTIVE, PAUSED, EXPIRED, DRAFT
    starts_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    ends_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    seller: Mapped["User"] = relationship("User")
    items: Mapped[List["PromotionItem"]] = relationship("PromotionItem", back_populates="promotion", cascade="all, delete-orphan")

class PromotionItem(Base):
    __tablename__ = "promotion_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    promotion_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("promotions.id"), nullable=False, index=True)
    seller_product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("seller_products.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=Decimal("1.000"), nullable=False)

    # Relationships
    promotion: Mapped["Promotion"] = relationship("Promotion", back_populates="items")
    seller_product: Mapped["SellerProduct"] = relationship("SellerProduct")
