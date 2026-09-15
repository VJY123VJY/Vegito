import datetime
from typing import Optional, List
from sqlalchemy import BigInteger, SmallInteger, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("roles.id"), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    customer_profile: Mapped[Optional["CustomerProfile"]] = relationship(
        "CustomerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    seller_profile: Mapped[Optional["SellerProfile"]] = relationship(
        "SellerProfile", back_populates="user", uselist=False, foreign_keys="SellerProfile.user_id"
    )
    delivery_partner: Mapped[Optional["DeliveryPartner"]] = relationship(
        "DeliveryPartner", back_populates="user", uselist=False
    )
    addresses: Mapped[List["Address"]] = relationship("Address", back_populates="user")
    cart: Mapped[Optional["Cart"]] = relationship("Cart", back_populates="user", uselist=False)
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="customer")
    favorites: Mapped[List["CustomerFavorite"]] = relationship("CustomerFavorite", back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")
