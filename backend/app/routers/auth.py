from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import SendOtpRequest, SendOtpResponse, VerifyOtpRequest, TokenResponse
from app.schemas.user import UserRead
from app.schemas.common import APIResponse
from app.services.auth_service import AuthService
from app.core.constants import RoleEnum, ROLE_NAME_MAP

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Customer Auth
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
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    user_read = UserRead.model_validate(current_user)
    user_read.role_name = ROLE_NAME_MAP.get(current_user.role_id)
    return APIResponse(message="User profile retrieved", data=user_read)
