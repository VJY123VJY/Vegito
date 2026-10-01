import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Numeric, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class BulkPricingRule(Base):
    __tablename__ = "bulk_pricing_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seller_product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    min_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    max_quantity: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3), nullable=True)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    seller_product: Mapped["SellerProduct"] = relationship("SellerProduct", back_populates="bulk_pricing_rules")
