import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import BigInteger, String, Numeric, Text, DateTime, Date, ForeignKey, func, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    order_type: Mapped[str] = mapped_column(String(20), default="RETAIL", nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    business_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    address_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("addresses.id"), nullable=False)
    seller_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    delivery_partner_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("delivery_partners.id"), nullable=True, index=True)
    shop_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("seller_profiles.id"), nullable=True, index=True)
    delivery_latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    delivery_longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    customer_delivery_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    landmark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="NEW", nullable=False, index=True)
    pickup_otp: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    pickup_otp_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pickup_otp_created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_otp_expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_otp_verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pickup_otp_max_attempts: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
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
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requested_delivery_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, index=True)
    requested_delivery_window: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    quote_total: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    quote_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quote_delivery_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    quote_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    quote_sent_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    quote_expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
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
    business: Mapped[Optional["BusinessProfile"]] = relationship("BusinessProfile", back_populates="orders")
    b2b_invoice: Mapped[Optional["B2BInvoice"]] = relationship("B2BInvoice", back_populates="order", uselist=False)

