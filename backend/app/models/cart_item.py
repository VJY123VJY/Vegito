import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, Numeric, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "seller_product_id", name="cart_items_cart_id_seller_product_id_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cart_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("carts.id"), nullable=False, index=True)
    seller_product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("seller_products.id"), nullable=False, index=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    cart: Mapped["Cart"] = relationship("Cart", back_populates="items")
    seller_product: Mapped["SellerProduct"] = relationship("SellerProduct")
