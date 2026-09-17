import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import BigInteger, String, Numeric, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    address_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("addresses.id"), nullable=False)
    seller_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    delivery_partner_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("delivery_partners.id"), nullable=True, index=True)
    shop_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("seller_profiles.id"), nullable=True, index=True)
    delivery_latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    delivery_longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="NEW", nullable=False, index=True)
    pickup_otp: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    pickup_otp_created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_otp_verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(30), default="COD", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    delivery_charge: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    delivery_slot_start: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    delivery_slot_end: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    customer_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    placed_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    accepted_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    packed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    ready_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    out_for_delivery_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id], back_populates="orders")
    seller: Mapped[Optional["User"]] = relationship("User", foreign_keys=[seller_id])
    delivery_partner: Mapped[Optional["DeliveryPartner"]] = relationship("DeliveryPartner", foreign_keys=[delivery_partner_id])
    shop: Mapped[Optional["SellerProfile"]] = relationship("SellerProfile", foreign_keys=[shop_id])
    address: Mapped["Address"] = relationship("Address")
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history: Mapped[List["OrderStatusHistory"]] = relationship(
        "OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at"
    )
    payment: Mapped[Optional["Payment"]] = relationship("Payment", back_populates="order", uselist=False)
    delivery_task: Mapped[Optional["DeliveryTask"]] = relationship("DeliveryTask", back_populates="order", uselist=False)
    complaints: Mapped[List["Complaint"]] = relationship("Complaint", back_populates="order")
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="order")
    coupon_usages: Mapped[List["CouponUsage"]] = relationship("CouponUsage", back_populates="order")
    seller_fulfillments: Mapped[List["SellerOrderFulfillment"]] = relationship(
        "SellerOrderFulfillment", back_populates="order", cascade="all, delete-orphan"
    )

