import re
from app.core.exceptions import BadRequestException

# Matches 10-digit Indian phone numbers with optional +91 or 0 prefix
PHONE_REGEX = re.compile(r"^(?:\+91|91|0)?[6-9]\d{9}$")


def validate_phone_number(phone: str) -> str:
    """
    Validates and normalizes phone number to standard 10-digit format.
    Raises BadRequestException if invalid.
    """
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())
    if not PHONE_REGEX.match(cleaned):
        raise BadRequestException("Invalid phone number. Must be a valid 10-digit Indian mobile number.")

    # Return standard 10 digits
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    return cleaned


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email(email: str) -> str:
    """Validates email format."""
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise BadRequestException("Invalid email format.")
    return cleaned
