from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User
from app.models.role import Role
from app.models.customer_profile import CustomerProfile
from app.models.seller_profile import SellerProfile
from app.models.delivery_partner import DeliveryPartner
from app.models.cart import Cart
from app.models.address import Address
from app.services.otp_service import OtpService
from app.services.jwt_service import create_access_token
from app.core.constants import RoleEnum, ROLE_ID_MAP, ROLE_NAME_MAP
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException, ConflictException
from app.schemas.auth import (
    TokenResponse,
    SendOtpResponse,
    CustomerRegisterRequest,
    SellerRegisterRequest,
    DeliveryPartnerRegisterRequest,
    UnifiedRegisterRequest,
    RegisterResponse,
)
from app.utils.validators import validate_phone_number
from app.core.security import hash_password, verify_password


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

    @staticmethod
    def send_otp_for_phone(db: Session, raw_phone: str) -> SendOtpResponse:
        phone = validate_phone_number(raw_phone)
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            raise NotFoundException("Account not found with this mobile number. Please register first.")
        if not user.is_active:
            raise ForbiddenException("Your account is deactivated. Please contact support.")

        _, otp_code = OtpService.send_otp(db, phone)
        is_test_mode = getattr(settings, "OTP_TEST_MODE", False) or getattr(settings, "OTP_DEV_MODE", False)
        dev_otp = otp_code if is_test_mode else None

        return SendOtpResponse(
            message=f"OTP sent successfully to {OtpService.to_e164(phone)}",
            phone=OtpService.to_e164(phone),
            dev_otp=dev_otp,
        )

    @staticmethod
    def verify_otp_for_phone(db: Session, raw_phone: str, otp_code: str) -> TokenResponse:
        phone = validate_phone_number(raw_phone)
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            raise NotFoundException("Account not found with this mobile number. Please register first.")
        if not user.is_active:
            raise ForbiddenException("Your account is deactivated. Please contact support.")

        OtpService.verify_otp(db, phone, otp_code)

        if not user.is_verified:
            user.is_verified = True
            db.commit()

        user_role_name = ROLE_NAME_MAP.get(user.role_id, "CUSTOMER")

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
            is_new_user=False,
        )

    @staticmethod
    def login_with_password(
        db: Session, raw_phone: str, password: str, expected_role: Optional[str] = None
    ) -> TokenResponse:
        phone = validate_phone_number(raw_phone)
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            raise NotFoundException("Account not found. Please register first.")
        if not user.is_active:
            raise ForbiddenException("Your account is deactivated. Please contact support.")

        if not user.password_hash or not verify_password(password, user.password_hash):
            raise BadRequestException("Incorrect mobile number or password.")

        user_role_name = ROLE_NAME_MAP.get(user.role_id, "CUSTOMER")

        if expected_role:
            norm_expected = expected_role.strip().upper()
            if norm_expected == "DELIVERY":
                norm_expected = "DELIVERY_PARTNER"
            if norm_expected != user_role_name and user_role_name not in ["ADMIN", "SUPER_ADMIN"]:
                role_display = "Delivery Partner" if user_role_name == "DELIVERY_PARTNER" else user_role_name.capitalize()
                expected_display = "Delivery Partner" if norm_expected == "DELIVERY_PARTNER" else norm_expected.capitalize()
                raise ForbiddenException(
                    f"Access denied. This account is registered as {role_display}. Please use the {role_display} login."
                )

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
            is_new_user=False,
        )

    @staticmethod
    def register_customer(db: Session, payload: CustomerRegisterRequest) -> RegisterResponse:
        phone = validate_phone_number(payload.phone)
        existing = db.query(User).filter(User.phone == phone).first()
        if existing:
            raise ConflictException("This mobile number is already registered. Please login.")

        pwd_hash = hash_password(payload.password) if payload.password else None
        user = User(
            phone=phone,
            role_id=ROLE_ID_MAP[RoleEnum.CUSTOMER],
            name=payload.name,
            email=payload.email,
            password_hash=pwd_hash,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()

        customer_profile = CustomerProfile(user_id=user.id)
        db.add(customer_profile)
        cart = Cart(user_id=user.id)
        db.add(cart)

        if payload.address:
            address = Address(
                user_id=user.id,
                address_line1=payload.address,
                city=payload.city or "Solapur",
                state="Maharashtra",
                pincode=payload.pincode or "413001",
                is_default=True,
                address_type="HOME",
            )
            db.add(address)

        db.commit()
        db.refresh(user)
        return RegisterResponse(
            message="Customer account created successfully. Please login with your mobile number and password.",
            user_id=user.id,
            phone=user.phone,
            role="CUSTOMER",
        )

    @staticmethod
    def register_seller(db: Session, payload: SellerRegisterRequest) -> RegisterResponse:
        phone = validate_phone_number(payload.phone)
        existing = db.query(User).filter(User.phone == phone).first()
        if existing:
            raise ConflictException("This mobile number is already registered. Please login.")

        pwd_hash = hash_password(payload.password) if payload.password else None
        user = User(
            phone=phone,
            role_id=ROLE_ID_MAP[RoleEnum.SELLER],
            name=payload.name,
            email=payload.email,
            password_hash=pwd_hash,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()

        addr_id = None
        if payload.business_address:
            address = Address(
                user_id=user.id,
                address_line1=payload.business_address,
                city=payload.city or "Solapur",
                state="Maharashtra",
                pincode=payload.pincode or "413001",
                is_default=True,
                address_type="WORK",
            )
            db.add(address)
            db.flush()
            addr_id = address.id

        seller_profile = SellerProfile(
            user_id=user.id,
            business_name=payload.business_name,
            description=payload.description,
            gst_number=payload.gst_number,
            address_id=addr_id,
            is_verified=True,
            rating=4.8,
        )
        db.add(seller_profile)
        db.commit()
        db.refresh(user)

        return RegisterResponse(
            message="Seller account created successfully. Please login with your mobile number and password.",
            user_id=user.id,
            phone=user.phone,
            role="SELLER",
        )

    @staticmethod
    def register_delivery_partner(db: Session, payload: DeliveryPartnerRegisterRequest) -> RegisterResponse:
        phone = validate_phone_number(payload.phone)
        existing = db.query(User).filter(User.phone == phone).first()
        if existing:
            raise ConflictException("This mobile number is already registered. Please login.")

        pwd_hash = hash_password(payload.password) if payload.password else None
        user = User(
            phone=phone,
            role_id=ROLE_ID_MAP[RoleEnum.DELIVERY_PARTNER],
            name=payload.name,
            email=payload.email,
            password_hash=pwd_hash,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()

        if payload.address:
            address = Address(
                user_id=user.id,
                address_line1=payload.address,
                city=payload.city or "Solapur",
                state="Maharashtra",
                pincode=payload.pincode or "413001",
                is_default=True,
                address_type="HOME",
            )
            db.add(address)

        delivery_partner = DeliveryPartner(
            user_id=user.id,
            vehicle_type=payload.vehicle_type or "Motorcycle",
            vehicle_number=payload.vehicle_number,
            is_available=True,
            is_verified=True,
            rating=4.9,
        )
        db.add(delivery_partner)
        db.commit()
        db.refresh(user)

        return RegisterResponse(
            message="Delivery partner account created successfully. Please login with your mobile number and password.",
            user_id=user.id,
            phone=user.phone,
            role="DELIVERY_PARTNER",
        )

    @staticmethod
    def register_unified(db: Session, payload: UnifiedRegisterRequest) -> RegisterResponse:
        norm_role = payload.role.strip().upper()
        if norm_role == "DELIVERY":
            norm_role = "DELIVERY_PARTNER"

        if norm_role == "CUSTOMER":
            return AuthService.register_customer(
                db,
                CustomerRegisterRequest(
                    name=payload.name,
                    phone=payload.phone,
                    password=payload.password,
                    email=payload.email,
                    address=payload.address,
                    city=payload.city,
                    pincode=payload.pincode,
                ),
            )
        elif norm_role == "SELLER":
            return AuthService.register_seller(
                db,
                SellerRegisterRequest(
                    name=payload.name,
                    phone=payload.phone,
                    password=payload.password,
                    email=payload.email,
                    business_name=payload.business_name or f"{payload.name}'s Farm",
                    business_address=payload.business_address or payload.address,
                    city=payload.city,
                    pincode=payload.pincode,
                    gst_number=payload.gst_number,
                    description=payload.description,
                ),
            )
        elif norm_role == "DELIVERY_PARTNER":
            return AuthService.register_delivery_partner(
                db,
                DeliveryPartnerRegisterRequest(
                    name=payload.name,
                    phone=payload.phone,
                    password=payload.password,
                    email=payload.email,
                    address=payload.address,
                    city=payload.city,
                    pincode=payload.pincode,
                    vehicle_type=payload.vehicle_type or "Motorcycle",
                    vehicle_number=payload.vehicle_number,
                ),
            )
        else:
            raise BadRequestException(
                f"Invalid role '{payload.role}'. Must be CUSTOMER, SELLER, or DELIVERY_PARTNER."
            )
