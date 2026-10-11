"""
test_firebase_auth.py — Tests for Firebase Authentication, ID Token Verification,
User Lookup, Role Assignment, and Onboarding in Vegito.
"""

import time
import pytest
import jwt
from unittest.mock import patch, MagicMock
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

from app.core.exceptions import UnauthorizedException, ForbiddenException, BadRequestException
from app.core.firebase import verify_firebase_id_token
from app.services.auth_service import AuthService
from app.models.user import User
from app.core.constants import RoleEnum, ROLE_ID_MAP
from app.models.customer_profile import CustomerProfile
from app.models.cart import Cart
from app.config import settings


@pytest.fixture(scope="module")
def rsa_key_pair():
    """Generates an RSA key pair for signing test RS256 JWTs."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    pem_public = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    return private_key, pem_public


def create_test_firebase_token(
    private_key,
    uid="firebase_test_uid_1001",
    phone_number="+919876543210",
    project_id="vegito-e35a1",
    expires_in=3600,
    auth_time_offset=-10,
    issuer=None,
    audience=None,
):
    now = int(time.time())
    iss = issuer or f"https://securetoken.google.com/{project_id}"
    aud = audience or project_id
    payload = {
        "iss": iss,
        "aud": aud,
        "sub": uid,
        "user_id": uid,
        "phone_number": phone_number,
        "auth_time": now + auth_time_offset,
        "iat": now + auth_time_offset,
        "exp": now + expires_in,
    }
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test-key-id"})


def test_verify_firebase_id_token_empty():
    """Empty or whitespace-only token must raise UnauthorizedException."""
    with pytest.raises(UnauthorizedException) as exc:
        verify_firebase_id_token("")
    assert "missing or empty" in str(exc.value.message).lower()

    with pytest.raises(UnauthorizedException):
        verify_firebase_id_token("   ")


def test_verify_firebase_id_token_expired(rsa_key_pair):
    """Expired Firebase token must raise UnauthorizedException with expired message."""
    private_key, _ = rsa_key_pair
    expired_token = create_test_firebase_token(private_key, expires_in=-120)

    with patch("google.oauth2.id_token.verify_firebase_token", side_effect=Exception("Token has expired")):
        with pytest.raises(UnauthorizedException) as exc:
            verify_firebase_id_token(expired_token)
        assert "expired" in str(exc.value.message).lower()


def test_verify_firebase_id_token_revoked():
    """Revoked Firebase token must raise UnauthorizedException with revoked message."""
    with patch("google.oauth2.id_token.verify_firebase_token", side_effect=Exception("Token has been revoked")):
        with pytest.raises(UnauthorizedException) as exc:
            verify_firebase_id_token("some_revoked_token")
        assert "revoked" in str(exc.value.message).lower()


def test_verify_firebase_id_token_invalid():
    """Malformed or tampered token must raise UnauthorizedException."""
    with pytest.raises(UnauthorizedException) as exc:
        verify_firebase_id_token("invalid.jwt.token")
    assert "invalid" in str(exc.value.message).lower()


def test_verify_firebase_id_token_valid(rsa_key_pair):
    """Valid Firebase token must return uid, phone_number, and decoded claims."""
    private_key, _ = rsa_key_pair
    project_id = settings.FIREBASE_PROJECT_ID or "vegito-e35a1"
    token = create_test_firebase_token(
        private_key,
        uid="fb_verified_user_777",
        phone_number="+919876543210",
        project_id=project_id,
    )

    mock_decoded = {
        "sub": "fb_verified_user_777",
        "phone_number": "+919876543210",
        "aud": project_id,
        "iss": f"https://securetoken.google.com/{project_id}",
    }

    with patch("google.oauth2.id_token.verify_firebase_token", return_value=mock_decoded):
        result = verify_firebase_id_token(token)
        assert result["uid"] == "fb_verified_user_777"
        assert result["phone_number"] == "+919876543210"
        assert result["decoded_token"]["aud"] == project_id


def test_verify_firebase_id_token_wrong_issuer(rsa_key_pair):
    """Token with mismatched issuer must be rejected."""
    private_key, _ = rsa_key_pair
    project_id = settings.FIREBASE_PROJECT_ID or "vegito-e35a1"
    token = create_test_firebase_token(private_key, project_id=project_id)

    mock_decoded = {
        "sub": "fb_user_1",
        "phone_number": "+919876543210",
        "aud": project_id,
        "iss": "https://securetoken.google.com/malicious-project",
    }

    with patch("google.oauth2.id_token.verify_firebase_token", return_value=mock_decoded):
        with pytest.raises(UnauthorizedException):
            verify_firebase_id_token(token)


def test_firebase_authenticate_new_user(db, rsa_key_pair):
    """
    When a new phone number authenticates with verified Firebase token:
    - User is created with CUSTOMER role
    - Phone number is normalized (10 digits)
    - CustomerProfile and Cart are provisioned
    - is_new_user is True
    """
    private_key, _ = rsa_key_pair
    new_phone = "9870001122"
    e164_phone = f"+91{new_phone}"
    fb_uid = f"fb_new_user_{int(time.time())}"

    mock_verified = {
        "uid": fb_uid,
        "phone_number": e164_phone,
        "email": None,
        "decoded_token": {"sub": fb_uid, "phone_number": e164_phone},
    }

    # Clean up if existing
    existing = db.query(User).filter(User.phone == new_phone).first()
    if existing:
        db.delete(existing)
        db.commit()

    with patch("app.services.auth_service.verify_firebase_id_token", return_value=mock_verified):
        res = AuthService.authenticate_with_firebase(db, "dummy_token")
        assert res.phone == new_phone
        assert res.role == "CUSTOMER"
        assert res.is_new_user is True
        assert res.access_token is not None

        # Check DB records
        created_user = db.query(User).filter(User.phone == new_phone).first()
        assert created_user is not None
        assert created_user.is_verified is True
        assert created_user.role_id == ROLE_ID_MAP[RoleEnum.CUSTOMER]
        assert created_user.firebase_uid == fb_uid

        profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == created_user.id).first()
        assert profile is not None

        cart = db.query(Cart).filter(Cart.user_id == created_user.id).first()
        assert cart is not None


def test_firebase_authenticate_existing_user(db, rsa_key_pair):
    """
    When an existing user authenticates with verified Firebase token:
    - User is retrieved
    - firebase_uid is updated/linked
    - Existing role is preserved
    - is_new_user is False
    """
    phone = "9870001123"
    e164_phone = f"+91{phone}"
    fb_uid = f"fb_existing_{int(time.time())}"

    # Setup existing user
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            role_id=ROLE_ID_MAP[RoleEnum.CUSTOMER],
            name="Existing Customer",
            is_active=True,
            is_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    mock_verified = {
        "uid": fb_uid,
        "phone_number": e164_phone,
        "email": None,
        "decoded_token": {"sub": fb_uid, "phone_number": e164_phone},
    }

    with patch("app.services.auth_service.verify_firebase_id_token", return_value=mock_verified):
        res = AuthService.authenticate_with_firebase(db, "dummy_token")
        assert res.phone == phone
        assert res.is_new_user is False
        assert res.user_id == user.id

        db.refresh(user)
        assert user.firebase_uid == fb_uid
        assert user.is_verified is True


def test_firebase_authenticate_deactivated_user(db):
    """Deactivated user must receive ForbiddenException."""
    phone = "9870001124"
    e164_phone = f"+91{phone}"

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            role_id=ROLE_ID_MAP[RoleEnum.CUSTOMER],
            name="Deactivated User",
            is_active=False,
            is_verified=True,
        )
        db.add(user)
        db.commit()
    else:
        user.is_active = False
        db.commit()

    mock_verified = {
        "uid": "fb_deactivated_123",
        "phone_number": e164_phone,
        "email": None,
        "decoded_token": {},
    }

    with patch("app.services.auth_service.verify_firebase_id_token", return_value=mock_verified):
        with pytest.raises(ForbiddenException):
            AuthService.authenticate_with_firebase(db, "dummy_token")


def test_firebase_authenticate_role_context_non_privilege(db):
    """
    A customer cannot gain unauthorized admin or seller privileges by simply
    passing role_context="ADMIN" or role_context="SELLER".
    """
    phone = "9870001125"
    e164_phone = f"+91{phone}"

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            role_id=ROLE_ID_MAP[RoleEnum.CUSTOMER],
            name="Standard Customer",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()

    mock_verified = {
        "uid": "fb_cust_attempting_privilege",
        "phone_number": e164_phone,
        "email": None,
        "decoded_token": {},
    }

    with patch("app.services.auth_service.verify_firebase_id_token", return_value=mock_verified):
        # Customer requests ADMIN role
        res = AuthService.authenticate_with_firebase(db, "dummy_token", role_context="ADMIN")
        # Must strictly remain CUSTOMER
        assert res.role == "CUSTOMER"
        assert "ADMIN" not in (res.authorized_roles or [])
