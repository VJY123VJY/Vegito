import hashlib
import bcrypt
from app.config import settings


def hash_secret(secret: str) -> str:
    """Hash a secret string using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(secret.encode("utf-8"), salt).decode("utf-8")


def verify_secret(secret: str, hashed: str) -> bool:
    """Verify a secret string against a bcrypt hash."""
    try:
        return bcrypt.checkpw(secret.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


hash_password = hash_secret
verify_password = verify_secret


def hash_otp(phone: str, otp: str) -> str:
    """
    Hash an OTP securely using SHA-256 combined with the phone number and JWT secret.
    Allows fast verification while preventing rainbow table attacks.
    """
    combined = f"{settings.JWT_SECRET_KEY}:{phone}:{otp}".encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


def verify_otp_hash(phone: str, otp: str, expected_hash: str) -> bool:
    """Verify if the provided OTP matches the stored hash."""
    return hash_otp(phone, otp) == expected_hash
