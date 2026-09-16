from typing import Optional
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.jwt_service import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.constants import RoleEnum, ROLE_NAME_MAP

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/customer/verify-otp",
    auto_error=False,
)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts, decodes, and verifies the JWT token from the Authorization header.
    Returns the active authenticated User.
    """
    if not token:
        raise UnauthorizedException("Authorization header is missing or invalid")

    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Token payload missing subject identifier")

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid user ID in token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("User associated with this token no longer exists")

    if not user.is_active:
        raise ForbiddenException("Your account is deactivated. Please contact support.")

    return user


def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Provides the user if authenticated, or None if anonymous."""
    if not token:
        return None
    try:
        return get_current_user(token=token, db=db)
    except UnauthorizedException:
        return None


def require_role(*allowed_roles: str):
    """Factory dependency that restricts access to users with specified role(s)."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = ROLE_NAME_MAP.get(current_user.role_id)
        if not user_role or user_role not in allowed_roles:
            raise ForbiddenException(
                f"Access forbidden: requires one of [{', '.join(allowed_roles)}] permissions"
            )
        return current_user

    return role_checker


require_customer = require_role(RoleEnum.CUSTOMER.value, RoleEnum.ADMIN.value, RoleEnum.SUPER_ADMIN.value)
require_seller = require_role(RoleEnum.SELLER.value, RoleEnum.ADMIN.value, RoleEnum.SUPER_ADMIN.value)
require_delivery_partner = require_role(
    RoleEnum.DELIVERY_PARTNER.value, RoleEnum.ADMIN.value, RoleEnum.SUPER_ADMIN.value
)
# V1: Same person is both SELLER and DELIVERY_PARTNER.
# This dependency allows a SELLER-role user to call delivery APIs.
# Remove or tighten in V2 when roles are truly separate accounts.
require_seller_or_delivery = require_role(
    RoleEnum.SELLER.value,
    RoleEnum.DELIVERY_PARTNER.value,
    RoleEnum.ADMIN.value,
    RoleEnum.SUPER_ADMIN.value,
)
require_admin = require_role(RoleEnum.ADMIN.value, RoleEnum.SUPER_ADMIN.value)
require_super_admin = require_role(RoleEnum.SUPER_ADMIN.value)
