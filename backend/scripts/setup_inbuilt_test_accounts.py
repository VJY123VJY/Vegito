import os
import sys
from decimal import Decimal
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.address import Address
from app.core.security import hash_password
from app.core.constants import RoleEnum, ROLE_ID_MAP

def setup_inbuilt_accounts():
    db = SessionLocal()
    try:
        pwd_hash = hash_password("password123")

        # ── 1. SETUP SELLER: 9309424359 ──────────────────────────────────────────
        phone_seller = "+919309424359"
        seller_user = db.query(User).filter(User.phone.like("%9309424359%")).first()
        if not seller_user:
            seller_user = User(
                phone=phone_seller,
                role_id=ROLE_ID_MAP[RoleEnum.SELLER],
                name="Vijay Dhavan",
                email="vijaydhavan04@gmail.com",
                password_hash=pwd_hash,
                is_active=True,
                is_verified=True,
            )
            db.add(seller_user)
            db.flush()
            print(f"Created new Seller user: ID={seller_user.id}, Phone={seller_user.phone}")
        # If another user holds this email, reassign it
        existing_email_user = db.query(User).filter(User.email == "vijaydhavan04@gmail.com").first()
        if existing_email_user and existing_email_user.phone != seller_user.phone:
            existing_email_user.email = f"seller_{existing_email_user.id}@vegito.in"
            db.flush()
            print(f"Reassigned email from user {existing_email_user.id} to avoid conflict")

        seller_user.role_id = ROLE_ID_MAP[RoleEnum.SELLER]
        seller_user.name = seller_user.name or "Vijay Dhavan"
        seller_user.email = "vijaydhavan04@gmail.com"
        seller_user.password_hash = pwd_hash
        seller_user.is_active = True
        seller_user.is_verified = True
        db.flush()
        print(f"Updated user ID={seller_user.id} ({seller_user.phone}) to SELLER role")

        # Create or update Address
        addr = db.query(Address).filter(Address.user_id == seller_user.id).first()
        if not addr:
            addr = Address(
                user_id=seller_user.id,
                address_line1="Patwardhan Baug Road, Mitrasadan Society, Vakil Nagar, Karvenagar",
                city="Pune",
                state="Maharashtra",
                pincode="411004",
                latitude=Decimal("18.4989000"),
                longitude=Decimal("73.8312000"),
                is_default=True,
                address_type="WORK",
            )
            db.add(addr)
            db.flush()
        else:
            addr.latitude = Decimal("18.4989000")
            addr.longitude = Decimal("73.8312000")
            addr.address_line1 = "Patwardhan Baug Road, Mitrasadan Society, Vakil Nagar, Karvenagar"
            addr.city = "Pune"
            addr.pincode = "411004"
            db.flush()

        # Create or update SellerProfile
        sp = db.query(SellerProfile).filter(SellerProfile.user_id == seller_user.id).first()
        if not sp:
            sp = SellerProfile(
                user_id=seller_user.id,
                business_name="Vegito Fresh Produce Store",
                business_type="Grocery / Fresh Produce Store",
                description="Farm-fresh daily vegetables and fruits from Pune & Solapur mandis",
                address="Patwardhan Baug Road, Mitrasadan Society, Vakil Nagar, Karvenagar, Pune, Maharashtra 411004",
                address_id=addr.id,
                latitude=Decimal("18.4989000"),
                longitude=Decimal("73.8312000"),
                gst_number="NJSSJKJNA",
                is_verified=True,
                kyc_status="VERIFIED",
                is_available=True,
                rating=Decimal("4.90"),
                total_orders=15,
            )
            db.add(sp)
            db.flush()
            print(f"Created SellerProfile: ID={sp.id}, Business={sp.business_name}")
        else:
            sp.business_name = sp.business_name or "Vegito Fresh Produce Store"
            sp.business_type = "Grocery / Fresh Produce Store"
            sp.gst_number = sp.gst_number or "NJSSJKJNA"
            sp.address = "Patwardhan Baug Road, Mitrasadan Society, Vakil Nagar, Karvenagar, Pune, Maharashtra 411004"
            sp.latitude = Decimal("18.4989000")
            sp.longitude = Decimal("73.8312000")
            sp.is_verified = True
            sp.kyc_status = "VERIFIED"
            sp.is_available = True
            print(f"Updated SellerProfile ID={sp.id}")

        # ── 2. SETUP DELIVERY PARTNER: 9876543210 ─────────────────────────────────
        phone_delivery = "+919876543210"
        deliv_user = db.query(User).filter(User.phone.like("%9876543210%")).first()
        if not deliv_user:
            deliv_user = User(
                phone=phone_delivery,
                role_id=ROLE_ID_MAP[RoleEnum.DELIVERY_PARTNER],
                name="Ramesh Delivery Partner",
                email="delivery.ramesh@vegito.in",
                password_hash=pwd_hash,
                is_active=True,
                is_verified=True,
            )
            db.add(deliv_user)
            db.flush()
            print(f"Created new Delivery Partner user: ID={deliv_user.id}, Phone={deliv_user.phone}")
        else:
            deliv_user.role_id = ROLE_ID_MAP[RoleEnum.DELIVERY_PARTNER]
            deliv_user.password_hash = pwd_hash
            deliv_user.is_active = True
            deliv_user.is_verified = True
            db.flush()
            print(f"Updated existing user ID={deliv_user.id} to DELIVERY_PARTNER role")

        dp = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == deliv_user.id).first()
        if not dp:
            dp = DeliveryPartner(
                user_id=deliv_user.id,
                vehicle_type="Motorcycle / Bike",
                vehicle_number="MH-12-AB-1234",
                is_available=True,
                is_verified=True,
                kyc_status="VERIFIED",
                rating=Decimal("4.95"),
                total_deliveries=42,
            )
            db.add(dp)
            db.flush()
            print(f"Created DeliveryPartner profile: ID={dp.id}")
        else:
            dp.is_available = True
            dp.is_verified = True
            dp.kyc_status = "VERIFIED"
            print(f"Updated DeliveryPartner profile ID={dp.id}")

        # ── 3. SETUP BACKUP DELIVERY PARTNER: 8888888888 ──────────────────────────
        phone_backup = "+918888888888"
        backup_user = db.query(User).filter(User.phone.like("%8888888888%")).first()
        if not backup_user:
            backup_user = User(
                phone=phone_backup,
                role_id=ROLE_ID_MAP[RoleEnum.DELIVERY_PARTNER],
                name="Suresh Delivery Rider",
                email="delivery.suresh@vegito.in",
                password_hash=pwd_hash,
                is_active=True,
                is_verified=True,
            )
            db.add(backup_user)
            db.flush()
            print(f"Created new Delivery Partner user: ID={backup_user.id}, Phone={backup_user.phone}")
        else:
            backup_user.role_id = ROLE_ID_MAP[RoleEnum.DELIVERY_PARTNER]
            backup_user.is_active = True
            backup_user.is_verified = True
            db.flush()

        dp2 = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == backup_user.id).first()
        if not dp2:
            dp2 = DeliveryPartner(
                user_id=backup_user.id,
                vehicle_type="EV Scooter",
                vehicle_number="MH-14-EV-5678",
                is_available=True,
                is_verified=True,
                kyc_status="VERIFIED",
                rating=Decimal("4.85"),
                total_deliveries=18,
            )
            db.add(dp2)
            db.flush()

        db.commit()
        print("\nAll Inbuilt Test Accounts Configured Successfully in Database!")
        print("  - SELLER:           +919309424359  (OTP: 123456 / Pass: password123)")
        print("  - DELIVERY PARTNER: +919876543210  (OTP: 123456 / Pass: password123)")
        print("  - DELIVERY PARTNER: +918888888888  (OTP: 123456 / Pass: password123)")

    except Exception as e:
        db.rollback()
        print(f"Error during setup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_inbuilt_accounts()
