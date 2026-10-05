import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Numeric, String, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class MarketIntelligence(Base):
    __tablename__ = "market_intelligence"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id"), nullable=False, index=True)
    market: Mapped[str] = mapped_column(String(100), default="Solapur APMC Mandi", nullable=False)
    district: Mapped[str] = mapped_column(String(50), default="Solapur", nullable=False)
    state: Mapped[str] = mapped_column(String(50), default="Maharashtra", nullable=False)
    reference_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # Modal market price
    previous_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    trend: Mapped[str] = mapped_column(String(20), default="STABLE")  # INCREASING, DECREASING, STABLE
    suggested_range_min: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # Min price
    suggested_range_max: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # Max price
    unit: Mapped[str] = mapped_column(String(30), default="kg", nullable=False)
    demand_signal: Mapped[str] = mapped_column(String(20), default="NORMAL")  # HIGH, LOW, NORMAL
    supply_signal: Mapped[str] = mapped_column(String(20), default="NORMAL")  # HIGH, LOW, NORMAL
    source: Mapped[str] = mapped_column(String(100), default="MSAMB / Solapur APMC", nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"))
    market_date: Mapped[datetime.date] = mapped_column(Date, default=datetime.date.today, nullable=False)
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product")
