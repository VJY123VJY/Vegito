from decimal import Decimal
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
from app.core.firebase import verify_firebase_id_token


class AuthService:
    @staticmethod
    def get_user_authorized_roles(db: Session, user: User) -> list[str]:
        """Discovers all valid workspaces / roles that this user account is authorized to access."""
        primary_role = ROLE_NAME_MAP.get(user.role_id, "CUSTOMER")
        roles = set()
        roles.add(primary_role)

        # Admin and Super Admin have elevated access
        if primary_role in ["ADMIN", "SUPER_ADMIN"]:
            roles.update(["CUSTOMER", "SELLER", "DELIVERY_PARTNER"])
            ordered = []
            for r in ["SELLER", "DELIVERY_PARTNER", "CUSTOMER", "ADMIN", "SUPER_ADMIN"]:
                if r in roles:
                    ordered.append(r)
            return ordered

        # Check existing profiles for multi-role accounts (e.g. Seller + Delivery partner in V1)
        if user.seller_profile or primary_role == "SELLER":
            roles.add("SELLER")
        if user.delivery_partner or primary_role == "DELIVERY_PARTNER":
            roles.add("DELIVERY_PARTNER")

        # For customer accounts, role is strictly CUSTOMER
        if primary_role == "CUSTOMER":
            roles = {"CUSTOMER"}
        else:
            # Operators (seller / delivery partner) should only have operator workspaces, not customer
            roles.discard("CUSTOMER")

        ordered = []
        for r in ["SELLER", "DELIVERY_PARTNER", "CUSTOMER"]:
            if r in roles:
                ordered.append(r)
        return ordered

    @staticmethod
    def send_otp_for_role(db: Session, raw_phone: str, role_enum: RoleEnum) -> SendOtpResponse:
        phone = validate_phone_number(raw_phone)

        # If user exists, verify they have the matching or compatible role
        user = db.query(User).filter(User.phone == phone).first()
        if user:
            if not user.is_active:
                raise ForbiddenException("Account is deactivated. Please contact support.")
            user_role_name = ROLE_NAME_MAP.get(user.role_id)
            authorized = AuthService.get_user_authorized_roles(db, user)
            # Allow login if role_enum is an authorized role for this user account (or admin)
            if role_enum.value not in authorized and user_role_name not in [RoleEnum.ADMIN.value, RoleEnum.SUPER_ADMIN.value]:
                raise BadRequestException(
                    f"This phone number is already registered under the {user_role_name} role. Please use the {user_role_name} portal."
                )

        otp_res = OtpService.send_otp(phone)
        dev_code = otp_res.get("dev_otp") if isinstance(otp_res, dict) else getattr(settings, "OTP_DEV_CODE", "123456")

        return SendOtpResponse(
            message=f"OTP sent successfully to {OtpService.to_e164(phone)}",
            phone=OtpService.to_e164(phone),
            dev_otp=dev_code,
        )

    @staticmethod
    def verify_otp_and_login(
        db: Session, raw_phone: str, otp_code: str, role_enum: RoleEnum, name: Optional[str] = None
    ) -> TokenResponse:
        phone = validate_phone_number(raw_phone)
        OtpService.verify_otp(phone, otp_code)

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
                    is_available=True,
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
        authorized_roles = AuthService.get_user_authorized_roles(db, user)
        active_role = role_enum.value if role_enum.value in authorized_roles else user_role_name

        token_payload: Dict[str, Any] = {
            "sub": str(user.id),
            "role": active_role,
            "phone": user.phone,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            role=active_role,
            phone=user.phone,
            name=user.name,
            is_new_user=is_new_user,
            authorized_roles=authorized_roles,
        )

    @staticmethod
    def send_otp_for_phone(db: Session, raw_phone: str) -> SendOtpResponse:
        phone = validate_phone_number(raw_phone)
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            raise NotFoundException("Account not found with this mobile number. Please register first.")
        if not user.is_active:
            raise ForbiddenException("Your account is deactivated. Please contact support.")

        otp_res = OtpService.send_otp(phone)
        dev_code = otp_res.get("dev_otp") if isinstance(otp_res, dict) else getattr(settings, "OTP_DEV_CODE", "123456")

        return SendOtpResponse(
            message=f"OTP sent successfully to {OtpService.to_e164(phone)}",
            phone=OtpService.to_e164(phone),
            dev_otp=dev_code,
        )

    @staticmethod
    def verify_otp_for_phone(db: Session, raw_phone: str, otp_code: str, role_context: Optional[str] = None) -> TokenResponse:
        phone = validate_phone_number(raw_phone)
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            raise NotFoundException("Account not found with this mobile number. Please register first.")
        if not user.is_active:
            raise ForbiddenException("Your account is deactivated. Please contact support.")

        OtpService.verify_otp(phone, otp_code)

        if not user.is_verified:
            user.is_verified = True
            db.commit()

        user_role_name = ROLE_NAME_MAP.get(user.role_id, "CUSTOMER")
        authorized_roles = AuthService.get_user_authorized_roles(db, user)
        active_role = user_role_name
        if role_context:
            norm_ctx = role_context.strip().upper()
            if norm_ctx == "DELIVERY":
                norm_ctx = "DELIVERY_PARTNER"
            if norm_ctx in authorized_roles:
                active_role = norm_ctx

        token_payload: Dict[str, Any] = {
            "sub": str(user.id),
            "role": active_role,
            "phone": user.phone,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            role=active_role,
            phone=user.phone,
            name=user.name,
            is_new_user=False,
            authorized_roles=authorized_roles,
        )

    @staticmethod
    def authenticate_with_firebase(
        db: Session,
        firebase_id_token: str,
        role_context: Optional[str] = None,
    ) -> TokenResponse:
        """
        Authenticates a user via verified Firebase ID Token.
        Derives phone and external identity from verified token.
        PostgreSQL remains the source of truth for business role.
        If user does not exist in PostgreSQL, registers them safely with CUSTOMER role.
        """
        verified = verify_firebase_id_token(firebase_id_token)
        firebase_uid = verified["uid"]
        phone_e164 = verified.get("phone_number")

        if not phone_e164:
            raise BadRequestException("Firebase ID token does not have an associated verified phone number.")

        normalized_phone = validate_phone_number(phone_e164)

        # 1. Lookup user by firebase_uid or normalized phone
        user = None
        if hasattr(User, "firebase_uid"):
            user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

        if not user:
            user = db.query(User).filter(User.phone == normalized_phone).first()
            if user and hasattr(User, "firebase_uid") and user.firebase_uid != firebase_uid:
                # Link existing PostgreSQL user to verified Firebase UID
                user.firebase_uid = firebase_uid
                if not user.is_verified:
                    user.is_verified = True
                db.commit()
                db.refresh(user)

        is_new_user = False
        if not user:
            # Safe default registration is CUSTOMER only
            customer_role_id = ROLE_ID_MAP[RoleEnum.CUSTOMER]
            user = User(
                phone=normalized_phone,
                role_id=customer_role_id,
                name=f"User {normalized_phone[-4:]}",
                is_active=True,
                is_verified=True,
            )
            if hasattr(User, "firebase_uid"):
                user.firebase_uid = firebase_uid
            db.add(user)
            db.flush()

            customer_profile = CustomerProfile(user_id=user.id)
            db.add(customer_profile)
            cart = Cart(user_id=user.id)
            db.add(cart)

            db.commit()
            db.refresh(user)
            is_new_user = True
        else:
            if not user.is_active:
                raise ForbiddenException("Your account is deactivated. Please contact support.")
            if not user.is_verified:
                user.is_verified = True
                db.commit()

        user_role_name = ROLE_NAME_MAP.get(user.role_id, "CUSTOMER")
        authorized_roles = AuthService.get_user_authorized_roles(db, user)
        active_role = user_role_name

        if role_context:
            norm_ctx = role_context.strip().upper()
            if norm_ctx == "DELIVERY":
                norm_ctx = "DELIVERY_PARTNER"
            # Only allow role context if user is authorized for that role
            if norm_ctx in authorized_roles:
                active_role = norm_ctx

        token_payload: Dict[str, Any] = {
            "sub": str(user.id),
            "role": active_role,
            "phone": user.phone,
            "firebase_uid": firebase_uid,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            role=active_role,
            phone=user.phone,
            name=user.name,
            is_new_user=is_new_user,
            authorized_roles=authorized_roles,
        )

    @staticmethod
    def switch_workspace(db: Session, user: User, target_role: str) -> TokenResponse:
        """Validates user authorization for target role/workspace and generates a new token without relogin."""
        norm_target = target_role.strip().upper()
        if norm_target == "DELIVERY":
            norm_target = "DELIVERY_PARTNER"

        authorized = AuthService.get_user_authorized_roles(db, user)
        if norm_target not in authorized:
            raise ForbiddenException(
                f"Access denied. Your account is not authorized for the {norm_target} workspace."
            )

        token_payload: Dict[str, Any] = {
            "sub": str(user.id),
            "role": norm_target,
            "phone": user.phone,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            role=norm_target,
            phone=user.phone,
            name=user.name,
            is_new_user=False,
            authorized_roles=authorized,
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

        authorized_roles = AuthService.get_user_authorized_roles(db, user)
        user_role_name = ROLE_NAME_MAP.get(user.role_id, "CUSTOMER")
        active_role = user_role_name

        if expected_role:
            norm_expected = expected_role.strip().upper()
            if norm_expected == "DELIVERY":
                norm_expected = "DELIVERY_PARTNER"
            if norm_expected not in authorized_roles and user_role_name not in ["ADMIN", "SUPER_ADMIN"]:
                role_display = "Delivery Partner" if user_role_name == "DELIVERY_PARTNER" else user_role_name.capitalize()
                expected_display = "Delivery Partner" if norm_expected == "DELIVERY_PARTNER" else norm_expected.capitalize()
                raise ForbiddenException(
                    f"Access denied. This account is registered as {role_display}. Please use the {role_display} login."
                )
            if norm_expected in authorized_roles:
                active_role = norm_expected

        token_payload: Dict[str, Any] = {
            "sub": str(user.id),
            "role": active_role,
            "phone": user.phone,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            role=active_role,
            phone=user.phone,
            name=user.name,
            is_new_user=False,
            authorized_roles=authorized_roles,
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
                latitude=Decimal(str(payload.latitude)),
                longitude=Decimal(str(payload.longitude)),
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
            address=payload.business_address,
            latitude=Decimal(str(payload.latitude)),
            longitude=Decimal(str(payload.longitude)),
            is_verified=True,
            rating=4.8,
            is_available=True,
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
                    latitude=payload.latitude,
                    longitude=payload.longitude,
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
