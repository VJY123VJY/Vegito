import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seller_product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("seller_products.id"), nullable=False, index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    seller_product: Mapped["SellerProduct"] = relationship("SellerProduct")
