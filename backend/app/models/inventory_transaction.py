import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Numeric, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    inventory_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("inventory.id"), nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # ORDER, MANUAL, RESTOCK
    reference_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    inventory: Mapped["Inventory"] = relationship("Inventory", back_populates="transactions")
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
