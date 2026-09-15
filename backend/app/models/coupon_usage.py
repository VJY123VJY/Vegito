import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, Numeric, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CouponUsage(Base):
    __tablename__ = "coupon_usage"
    __table_args__ = (
        UniqueConstraint("coupon_id", "user_id", "order_id", name="coupon_usage_coupon_id_user_id_order_id_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    coupon_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("coupons.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id"), nullable=False, index=True)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    coupon: Mapped["Coupon"] = relationship("Coupon", back_populates="usages")
    user: Mapped["User"] = relationship("User")
    order: Mapped["Order"] = relationship("Order", back_populates="coupon_usages")
