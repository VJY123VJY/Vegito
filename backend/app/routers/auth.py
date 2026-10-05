from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    PasswordLoginRequest,
    UnifiedRegisterRequest,
    TokenResponse,
    CustomerRegisterRequest,
    SellerRegisterRequest,
    DeliveryPartnerRegisterRequest,
    RegisterResponse,
    SwitchWorkspaceRequest,
)
from app.schemas.user import UserRead
from app.schemas.common import APIResponse
from app.services.auth_service import AuthService
from app.core.constants import RoleEnum, ROLE_NAME_MAP

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── MOBILE + PASSWORD AUTHENTICATION ─────────────────────────────────────────
@router.post(
    "/login",
    response_model=APIResponse[TokenResponse],
    summary="Login with registered mobile number and password",
)
def login_with_password(payload: PasswordLoginRequest, db: Session = Depends(get_db)):
    token_res = AuthService.login_with_password(db, payload.phone, payload.password, payload.role)
    return APIResponse(message="Login successful", data=token_res)


@router.post(
    "/register",
    response_model=APIResponse[RegisterResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account with role, mobile number, and password",
)
def register_user(payload: UnifiedRegisterRequest, db: Session = Depends(get_db)):
    res = AuthService.register_unified(db, payload)
    return APIResponse(message=res.message, data=res)


# ── UNIFIED MOBILE OTP LOGIN (Role determined by backend) ──────────────────────
@router.post(
    "/send-otp",
    response_model=APIResponse[SendOtpResponse],
    summary="Send OTP for registered user login by mobile number",
)
def send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    res = AuthService.send_otp_for_phone(db, payload.phone)
    return APIResponse(message=res.message, data=res)


@router.post(
    "/verify-otp",
    response_model=APIResponse[TokenResponse],
    summary="Verify OTP and obtain JWT token (Backend resolves user role)",
)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    token_res = AuthService.verify_otp_for_phone(db, payload.phone, payload.otp, payload.role)
    return APIResponse(message="Authentication successful", data=token_res)


# ── ROLE-BASED REGISTRATION (Customer, Seller, Delivery Partner) ─────────────
@router.post(
    "/register/customer",
    response_model=APIResponse[RegisterResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Customer account",
)
def register_customer(payload: CustomerRegisterRequest, db: Session = Depends(get_db)):
    res = AuthService.register_customer(db, payload)
    return APIResponse(message=res.message, data=res)


@router.post(
    "/register/seller",
    response_model=APIResponse[RegisterResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Seller account",
)
def register_seller(payload: SellerRegisterRequest, db: Session = Depends(get_db)):
    res = AuthService.register_seller(db, payload)
    return APIResponse(message=res.message, data=res)


@router.post(
    "/register/delivery-partner",
    response_model=APIResponse[RegisterResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Delivery Partner account",
)
def register_delivery_partner(payload: DeliveryPartnerRegisterRequest, db: Session = Depends(get_db)):
    res = AuthService.register_delivery_partner(db, payload)
    return APIResponse(message=res.message, data=res)


# ── LEGACY PORTAL-SPECIFIC OTP AUTH (Maintained for backward compatibility) ────
@router.post(
    "/customer/send-otp",
    response_model=APIResponse[SendOtpResponse],
    summary="Send OTP for Customer login/registration",
)
def customer_send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    res = AuthService.send_otp_for_role(db, payload.phone, RoleEnum.CUSTOMER)
    return APIResponse(message=res.message, data=res)


@router.post(
    "/customer/verify-otp",
    response_model=APIResponse[TokenResponse],
    summary="Verify OTP and obtain Customer JWT token",
)
def customer_verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    token_res = AuthService.verify_otp_and_login(
        db, payload.phone, payload.otp, RoleEnum.CUSTOMER, name=payload.name
    )
    return APIResponse(message="Authentication successful", data=token_res)


# Seller Auth
@router.post(
    "/seller/send-otp",
    response_model=APIResponse[SendOtpResponse],
    summary="Send OTP for Seller login/registration",
)
def seller_send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    res = AuthService.send_otp_for_role(db, payload.phone, RoleEnum.SELLER)
    return APIResponse(message=res.message, data=res)


@router.post(
    "/seller/verify-otp",
    response_model=APIResponse[TokenResponse],
    summary="Verify OTP and obtain Seller JWT token",
)
def seller_verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    token_res = AuthService.verify_otp_and_login(
        db, payload.phone, payload.otp, RoleEnum.SELLER, name=payload.name
    )
    return APIResponse(message="Authentication successful", data=token_res)


# Delivery Partner Auth
@router.post(
    "/delivery/send-otp",
    response_model=APIResponse[SendOtpResponse],
    summary="Send OTP for Delivery Partner login/registration",
)
def delivery_send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    res = AuthService.send_otp_for_role(db, payload.phone, RoleEnum.DELIVERY_PARTNER)
    return APIResponse(message=res.message, data=res)


@router.post(
    "/delivery/verify-otp",
    response_model=APIResponse[TokenResponse],
    summary="Verify OTP and obtain Delivery Partner JWT token",
)
def delivery_verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    token_res = AuthService.verify_otp_and_login(
        db, payload.phone, payload.otp, RoleEnum.DELIVERY_PARTNER, name=payload.name
    )
    return APIResponse(message="Authentication successful", data=token_res)


# Admin Auth
@router.post(
    "/admin/send-otp",
    response_model=APIResponse[SendOtpResponse],
    summary="Send OTP for Admin login",
)
def admin_send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    res = AuthService.send_otp_for_role(db, payload.phone, RoleEnum.ADMIN)
    return APIResponse(message=res.message, data=res)


@router.post(
    "/admin/verify-otp",
    response_model=APIResponse[TokenResponse],
    summary="Verify OTP and obtain Admin JWT token",
)
def admin_verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    token_res = AuthService.verify_otp_and_login(
        db, payload.phone, payload.otp, RoleEnum.ADMIN, name=payload.name
    )
    return APIResponse(message="Authentication successful", data=token_res)


# Current User Info
@router.get(
    "/me",
    response_model=APIResponse[UserRead],
    summary="Get current authenticated user profile with authorized roles",
)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_read = UserRead.model_validate(current_user)
    authorized = AuthService.get_user_authorized_roles(db, current_user)
    active_role = getattr(current_user, "_active_token_role", None)
    if active_role and active_role in authorized:
        user_read.role_name = active_role
    else:
        user_read.role_name = ROLE_NAME_MAP.get(current_user.role_id)
    user_read.authorized_roles = authorized
    return APIResponse(message="User profile retrieved", data=user_read)


@router.post(
    "/switch-workspace",
    response_model=APIResponse[TokenResponse],
    summary="Switch authenticated session to an authorized role/workspace without logging out",
)
def switch_workspace(
    payload: SwitchWorkspaceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token_res = AuthService.switch_workspace(db, current_user, payload.target_role)
    return APIResponse(message=f"Switched workspace to {payload.target_role}", data=token_res)
