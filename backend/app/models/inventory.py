import datetime
from decimal import Decimal
from typing import List
from sqlalchemy import BigInteger, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seller_product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("seller_products.id"), unique=True, nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=Decimal("0.000"), nullable=False)
    reserved_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=Decimal("0.000"), nullable=False)
    low_stock_threshold: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=Decimal("5.000"), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    seller_product: Mapped["SellerProduct"] = relationship("SellerProduct", back_populates="inventory")
    transactions: Mapped[List["InventoryTransaction"]] = relationship(
        "InventoryTransaction", back_populates="inventory", cascade="all, delete-orphan"
    )
