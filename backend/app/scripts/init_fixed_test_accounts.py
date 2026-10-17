"""
Script: init_fixed_test_accounts.py
Ensures the test Seller (9999999999) and Delivery Partner (8888888888) accounts
exist in the database with their respective profiles for development testing.
Idempotent and safe to run multiple times.
"""

from decimal import Decimal
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.core.constants import RoleEnum, ROLE_ID_MAP


def ensure_fixed_test_accounts(db: Session):
    # 1. Test Seller: 9999999999
    seller_phone = "9999999999"
    seller_user = db.query(User).filter(User.phone == seller_phone).first()
    if not seller_user:
        seller_user = User(
            phone=seller_phone,
            name="Solapur Test Seller",
            role_id=ROLE_ID_MAP[RoleEnum.SELLER],
            is_active=True,
            is_verified=True,
        )
        db.add(seller_user)
        db.flush()
    else:
        seller_user.role_id = ROLE_ID_MAP[RoleEnum.SELLER]
        seller_user.is_active = True
        seller_user.is_verified = True

    seller_profile = db.query(SellerProfile).filter(SellerProfile.user_id == seller_user.id).first()
    if not seller_profile:
        seller_profile = SellerProfile(
            user_id=seller_user.id,
            business_name="Solapur Fresh Test Store",
            business_type="Grocery / Fresh Produce Store",
            latitude=Decimal("17.6805"),
            longitude=Decimal("75.9064"),
            is_available=True,
            is_verified=True,
        )
        db.add(seller_profile)
    else:
        seller_profile.is_available = True
        seller_profile.is_verified = True
        if seller_profile.latitude is None:
            seller_profile.latitude = Decimal("17.6805")
            seller_profile.longitude = Decimal("75.9064")

    # 2. Test Delivery Partner: 8888888888
    dp_phone = "8888888888"
    dp_user = db.query(User).filter(User.phone == dp_phone).first()
    if not dp_user:
        dp_user = User(
            phone=dp_phone,
            name="Solapur Test Delivery Partner",
            role_id=ROLE_ID_MAP[RoleEnum.DELIVERY_PARTNER],
            is_active=True,
            is_verified=True,
        )
        db.add(dp_user)
        db.flush()
    else:
        dp_user.role_id = ROLE_ID_MAP[RoleEnum.DELIVERY_PARTNER]
        dp_user.is_active = True
        dp_user.is_verified = True

    dp_profile = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == dp_user.id).first()
    if not dp_profile:
        dp_profile = DeliveryPartner(
            user_id=dp_user.id,
            vehicle_type="Motorcycle",
            vehicle_number="MH-13-DP-8888",
            is_available=True,
            is_verified=True,
            rating=4.9,
        )
        db.add(dp_profile)
    else:
        dp_profile.is_available = True
        dp_profile.is_verified = True

    db.commit()
    print(f"Fixed test accounts initialized:")
    print(f"  Seller: ID={seller_user.id}, Phone={seller_user.phone}, Role=SELLER")
    print(f"  Delivery Partner: ID={dp_user.id}, Phone={dp_user.phone}, Role=DELIVERY_PARTNER")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        ensure_fixed_test_accounts(db)
    finally:
        db.close()
