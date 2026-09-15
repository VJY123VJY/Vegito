import datetime
from typing import Optional
from sqlalchemy import BigInteger, SmallInteger, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id"), nullable=False, index=True)
    order_item_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("order_items.id"), nullable=True, index=True
    )
    customer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    seller_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    delivery_partner_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("delivery_partners.id"), nullable=True, index=True
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("products.id"), nullable=True, index=True
    )
    product_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    seller_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    delivery_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="reviews")
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])
    seller: Mapped[Optional["User"]] = relationship("User", foreign_keys=[seller_id])
    delivery_partner: Mapped[Optional["DeliveryPartner"]] = relationship("DeliveryPartner")
    product: Mapped[Optional["Product"]] = relationship("Product", back_populates="reviews")
    order_item: Mapped[Optional["OrderItem"]] = relationship("OrderItem")
