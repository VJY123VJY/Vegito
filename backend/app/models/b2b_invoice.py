import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, String, Text, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class B2BInvoice(Base):
    __tablename__ = "b2b_invoices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    business_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True
    )
    business_name: Mapped[str] = mapped_column(String(150), nullable=False)
    business_address: Mapped[str] = mapped_column(Text, nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    seller_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    seller_name: Mapped[str] = mapped_column(String(150), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="COD", nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="b2b_invoice")
    business: Mapped[Optional["BusinessProfile"]] = relationship("BusinessProfile")
    seller: Mapped[Optional["User"]] = relationship("User")
