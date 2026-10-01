import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import BigInteger, Numeric, Boolean, DateTime, Date, Time, String, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SellerProduct(Base):
    __tablename__ = "seller_products"
    __table_args__ = (
        UniqueConstraint("seller_id", "product_id", name="seller_products_seller_id_product_id_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seller_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id"), nullable=False, index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    stock_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=Decimal("0.000"), nullable=False)
    minimum_order_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=Decimal("1.000"), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Freshness factual attributes provided by seller
    added_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    added_time: Mapped[Optional[datetime.time]] = mapped_column(Time, nullable=True)
    harvest_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    harvest_time: Mapped[Optional[datetime.time]] = mapped_column(Time, nullable=True)
    storage_condition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    origin: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    seller: Mapped["User"] = relationship("User", foreign_keys=[seller_id])
    product: Mapped["Product"] = relationship("Product", back_populates="seller_products")
    inventory: Mapped[Optional["Inventory"]] = relationship(
        "Inventory", back_populates="seller_product", uselist=False, cascade="all, delete-orphan"
    )
    bulk_pricing_rules: Mapped[List["BulkPricingRule"]] = relationship(
        "BulkPricingRule", back_populates="seller_product", cascade="all, delete-orphan"
    )
