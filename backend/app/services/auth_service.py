from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User
from app.models.role import Role
from app.models.customer_profile import CustomerProfile
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.cart import Cart
from app.services.otp_service import OtpService
from app.services.jwt_service import create_access_token
from app.core.constants import RoleEnum, ROLE_ID_MAP, ROLE_NAME_MAP
from app.core.exceptions import BadRequestException, ForbiddenException
from app.schemas.auth import TokenResponse, SendOtpResponse
from app.utils.validators import validate_phone_number


class AuthService:
    @staticmethod
    def send_otp_for_role(db: Session, raw_phone: str, role_enum: RoleEnum) -> SendOtpResponse:
        phone = validate_phone_number(raw_phone)

        # If user exists, verify they have the matching or compatible role
        user = db.query(User).filter(User.phone == phone).first()
        if user:
            if not user.is_active:
                raise ForbiddenException("Account is deactivated. Please contact support.")
            user_role_name = ROLE_NAME_MAP.get(user.role_id)
            # Allow admins to log in across portals if desired, but disallow role collision between customer/seller/delivery
            if user_role_name != role_enum.value and user_role_name not in [RoleEnum.ADMIN.value, RoleEnum.SUPER_ADMIN.value]:
                raise BadRequestException(
                    f"This phone number is already registered under the {user_role_name} role. Please use the {user_role_name} portal."
                )

        _, otp_code = OtpService.send_otp(db, phone)
        dev_otp = otp_code if settings.OTP_DEV_MODE and not OtpService.is_twilio_configured() else None

        return SendOtpResponse(
            message=f"OTP sent successfully to {OtpService.to_e164(phone)}",
            phone=OtpService.to_e164(phone),
            dev_otp=dev_otp,
        )

    @staticmethod
    def verify_otp_and_login(
        db: Session, raw_phone: str, otp_code: str, role_enum: RoleEnum, name: Optional[str] = None
    ) -> TokenResponse:
        phone = validate_phone_number(raw_phone)
        OtpService.verify_otp(db, phone, otp_code)

        user = db.query(User).filter(User.phone == phone).first()
        is_new_user = False

        if not user:
            # Registration: create central user with specified role
            role_id = ROLE_ID_MAP[role_enum]
            user = User(
                phone=phone,
                role_id=role_id,
                name=name or f"User {phone[-4:]}",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()  # Generate user.id
            is_new_user = True

            # Create role-specific record
            if role_enum == RoleEnum.CUSTOMER:
                customer_profile = CustomerProfile(user_id=user.id)
                db.add(customer_profile)
                # Also create default empty Cart
                cart = Cart(user_id=user.id)
                db.add(cart)
            elif role_enum == RoleEnum.SELLER:
                seller_profile = SellerProfile(
                    user_id=user.id,
                    business_name=name or f"Seller {phone[-4:]}",
                )
                db.add(seller_profile)
            elif role_enum == RoleEnum.DELIVERY_PARTNER:
                delivery_partner = DeliveryPartner(user_id=user.id)
                db.add(delivery_partner)

            db.commit()
            db.refresh(user)
        else:
            if not user.is_active:
                raise ForbiddenException("Your account is deactivated. Please contact support.")
            if not user.is_verified:
                user.is_verified = True
                db.commit()

        user_role_name = ROLE_NAME_MAP.get(user.role_id, role_enum.value)

        token_payload: Dict[str, Any] = {
            "sub": str(user.id),
            "role": user_role_name,
            "phone": user.phone,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            role=user_role_name,
            phone=user.phone,
            name=user.name,
            is_new_user=is_new_user,
        )
