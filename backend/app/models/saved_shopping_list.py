import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import BigInteger, String, Text, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SavedShoppingList(Base):
    __tablename__ = "saved_shopping_lists"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    items: Mapped[List["SavedShoppingListItem"]] = relationship(
        "SavedShoppingListItem", back_populates="shopping_list", cascade="all, delete-orphan"
    )


class SavedShoppingListItem(Base):
    __tablename__ = "saved_shopping_list_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    list_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("saved_shopping_lists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    seller_product_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("seller_products.id", ondelete="SET NULL"), nullable=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), default="KG", nullable=False)

    # Relationships
    shopping_list: Mapped["SavedShoppingList"] = relationship("SavedShoppingList", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
    seller_product: Mapped[Optional["SellerProduct"]] = relationship("SellerProduct")
