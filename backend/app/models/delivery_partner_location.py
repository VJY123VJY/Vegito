import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Numeric, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeliveryPartnerLocation(Base):
    __tablename__ = "delivery_partner_locations"
    __table_args__ = (
        Index("ix_delivery_partner_locations_partner_time", "delivery_partner_id", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    delivery_partner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("delivery_partners.id", ondelete="CASCADE"), nullable=False, index=True
    )
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    accuracy_meters: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    heading: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    speed_kmh: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    recorded_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, index=True
    )

    # Relationships
    delivery_partner: Mapped["DeliveryPartner"] = relationship(
        "DeliveryPartner", back_populates="locations"
    )
