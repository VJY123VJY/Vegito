import secrets
from app.config import settings


def generate_otp(length: int = 6) -> str:
    """
    Generates a secure numeric OTP of the specified length.
    If OTP_DEV_MODE is enabled, returns the OTP_DEV_CODE if configured.
    """
    if settings.OTP_DEV_MODE and settings.OTP_DEV_CODE:
        return settings.OTP_DEV_CODE

    # Generate cryptographically secure random digits
    range_start = 10 ** (length - 1)
    range_end = (10 ** length) - 1
    return str(secrets.randbelow(range_end - range_start + 1) + range_start)


def generate_delivery_otp(length: int = 4) -> str:
    """
    Generates a 4-digit OTP specifically for delivery verification at customer doorstep.
    """
    range_start = 10 ** (length - 1)
    range_end = (10 ** length) - 1
    return str(secrets.randbelow(range_end - range_start + 1) + range_start)


def generate_pickup_code(length: int = 6) -> str:
    """
    Generates a cryptographically secure random 6-digit numeric pickup code.
    Example: '482731'
    Unique per active order, unpredictable.
    """
    range_start = 10 ** (length - 1)
    range_end = (10 ** length) - 1
    return str(secrets.randbelow(range_end - range_start + 1) + range_start)


def generate_pickup_otp(length: int = 6) -> str:
    """
    Generates a pickup OTP for shop-to-delivery-partner handover.
    Returns a cryptographically secure random 6-digit code.
    """
    return generate_pickup_code(length=length)

