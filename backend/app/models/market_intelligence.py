import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Numeric, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class MarketIntelligence(Base):
    __tablename__ = "market_intelligence"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id"), nullable=False, index=True)
    reference_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    previous_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    trend: Mapped[str] = mapped_column(String(20), default="STABLE")  # INCREASING, DECREASING, STABLE
    suggested_range_min: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    suggested_range_max: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    demand_signal: Mapped[str] = mapped_column(String(20), default="NORMAL")  # HIGH, LOW, NORMAL
    supply_signal: Mapped[str] = mapped_column(String(20), default="NORMAL")  # HIGH, LOW, NORMAL
    source: Mapped[str] = mapped_column(String(100), default="Solapur Mandi")
    confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"))
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product")
