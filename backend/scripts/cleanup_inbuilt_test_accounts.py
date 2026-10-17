import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.core.constants import RoleEnum, ROLE_ID_MAP

def cleanup_inbuilt_accounts():
    db = SessionLocal()
    try:
        # 1. Remove temporary delivery partner 9876543210
        deliv = db.query(User).filter(User.phone.like("%9876543210%")).first()
        if deliv:
            dp = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == deliv.id).first()
            if dp:
                db.delete(dp)
            db.delete(deliv)
            print("Removed delivery partner 9876543210")

        # 2. Reset 9309424359 back to CUSTOMER if desired (optional prompt)
        user = db.query(User).filter(User.phone.like("%9309424359%")).first()
        if user:
            user.role_id = ROLE_ID_MAP[RoleEnum.CUSTOMER]
            print("Reverted 9309424359 role to CUSTOMER")

        db.commit()
        print("Cleanup completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_inbuilt_accounts()
