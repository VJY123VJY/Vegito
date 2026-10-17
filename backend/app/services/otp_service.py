import time
import logging
from typing import Dict, Optional
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client
from app.config import settings
from app.core.exceptions import (
    BadRequestException,
    ServiceUnavailableException,
    TooManyRequestsException,
)

logger = logging.getLogger("vegito.auth.otp")

# In-memory cooldown tracker: phone -> timestamp
_last_sent_timestamps: Dict[str, float] = {}
RESEND_COOLDOWN_SECONDS = 30


def _mask_phone(phone: str) -> str:
    cleaned = (phone or "").strip()
    if len(cleaned) >= 4:
        return f"******{cleaned[-4:]}"
    return "******"


FIXED_TEST_ACCOUNTS: Dict[str, str] = {
    "9309424359": "SELLER",            # Inbuilt Seller testing account
    "9876543210": "DELIVERY_PARTNER",  # Inbuilt Delivery Partner testing account
    "8888888888": "DELIVERY_PARTNER",  # Inbuilt Delivery Partner testing account
    "9999999999": "SELLER",
}
FIXED_TEST_OTP = "123456"


def is_fixed_otp_enabled(phone: Optional[str] = None) -> bool:
    """
    Fixed OTP authentication is enabled for:
    1. Specifically designated inbuilt test accounts (regardless of environment).
    2. When FIXED_OTP_TEST_MODE is True outside of production.
    """
    if phone:
        clean = (phone or "").replace("+91", "").strip()[-10:]
        if clean in FIXED_TEST_ACCOUNTS:
            return True
    env = (getattr(settings, "ENVIRONMENT", "") or "").strip().lower()
    if env == "production":
        return False
    return bool(getattr(settings, "FIXED_OTP_TEST_MODE", False))



class OtpService:
    @staticmethod
    def clear_rate_limits():
        _last_sent_timestamps.clear()

    @staticmethod
    def is_twilio_configured() -> bool:
        return bool(
            settings.TWILIO_ACCOUNT_SID
            and settings.TWILIO_AUTH_TOKEN
            and settings.TWILIO_VERIFY_SERVICE_SID
        )

    @staticmethod
    def to_e164(phone: str) -> str:
        digits = "".join(ch for ch in phone if ch.isdigit())
        if phone.startswith("+"):
            return phone
        if digits.startswith("91") and len(digits) == 12:
            return f"+{digits}"
        return f"+91{digits}"

    @staticmethod
    def _twilio_client() -> Client:
        return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    @staticmethod
    def send_otp(phone: str) -> dict:
        e164_phone = OtpService.to_e164(phone)
        masked = _mask_phone(phone)
        clean_phone = phone.replace("+91", "").strip()[-10:]

        # Rate limiting: 30-second resend cooldown per phone number
        now = time.time()
        last_sent = _last_sent_timestamps.get(e164_phone, 0.0)
        elapsed = now - last_sent
        if elapsed < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
            raise TooManyRequestsException(
                f"Please wait {remaining} seconds before requesting another verification code."
            )

        # Fixed OTP test bypass for local testing of Seller & Delivery Partner
        if is_fixed_otp_enabled(clean_phone) and clean_phone in FIXED_TEST_ACCOUNTS:
            _last_sent_timestamps[e164_phone] = now
            logger.info("Fixed test OTP active for %s (%s) — SMS delivery bypassed", masked, FIXED_TEST_ACCOUNTS[clean_phone])
            return {"fallback": True, "dev_otp": FIXED_TEST_OTP}

        if not OtpService.is_twilio_configured():
            is_test_mode = getattr(settings, "OTP_TEST_MODE", False) or getattr(settings, "OTP_DEV_MODE", False)
            if is_test_mode:
                dev_code = getattr(settings, "OTP_DEV_CODE", None) or "123456"
                logger.info("Twilio not configured; fallback test mode active for %s", masked)
                _last_sent_timestamps[e164_phone] = now
                return {"dev_otp": dev_code, "fallback": True}
            raise ServiceUnavailableException("SMS verification service is not configured.")

        try:
            OtpService._twilio_client().verify.v2.services(
                settings.TWILIO_VERIFY_SERVICE_SID
            ).verifications.create(to=e164_phone, channel="sms")
            _last_sent_timestamps[e164_phone] = now
            logger.info("Twilio Verify SMS requested for %s", masked)
            return {"fallback": False}
        except TwilioRestException as exc:
            logger.warning(
                "Twilio Verify send failed for %s code=%s status=%s: %s",
                masked,
                exc.code,
                exc.status,
                exc.msg,
            )
            if exc.code == 60200:
                raise BadRequestException("Invalid mobile number format. Please check the number and try again.") from exc
            elif exc.code == 60203:
                raise TooManyRequestsException(
                    "Too many verification requests. Please wait a few minutes before trying again."
                ) from exc
            elif exc.code == 21608:
                if clean_phone in FIXED_TEST_ACCOUNTS:
                    logger.info("Carrier restriction for test account %s, falling back to test OTP", masked)
                    return {"fallback": True, "dev_otp": FIXED_TEST_OTP}
                raise BadRequestException(
                    "SMS delivery to this number is restricted by the carrier or provider settings."
                ) from exc
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc
        except Exception as exc:
            logger.warning("Twilio client error for %s: %s", masked, type(exc).__name__)
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc

    @staticmethod
    def verify_otp(phone: str, otp_code: str) -> bool:
        clean_code = (otp_code or "").strip()
        e164_phone = OtpService.to_e164(phone)
        masked = _mask_phone(phone)
        clean_phone = phone.replace("+91", "").strip()[-10:]

        if not clean_code or len(clean_code) < 4:
            raise BadRequestException("Please enter a valid 6-digit verification code.")

        # Fixed OTP test verification for Seller / Delivery Partner testing
        if is_fixed_otp_enabled(clean_phone) and clean_phone in FIXED_TEST_ACCOUNTS:
            if clean_code == FIXED_TEST_OTP:
                logger.info("Fixed test OTP verified successfully for %s", masked)
                return True
            else:
                logger.warning("Fixed test OTP verification failed for %s", masked)
                raise BadRequestException("Invalid verification code. Please check the code and try again.")

        if not OtpService.is_twilio_configured():
            is_test_mode = getattr(settings, "OTP_TEST_MODE", False) or getattr(settings, "OTP_DEV_MODE", False)
            dev_code = getattr(settings, "OTP_DEV_CODE", None) or "123456"
            if is_test_mode and clean_code == dev_code:
                logger.info("OTP verified via fallback test mode for %s", masked)
                return True
            raise ServiceUnavailableException("SMS verification service is not configured.")

        try:
            result = OtpService._twilio_client().verify.v2.services(
                settings.TWILIO_VERIFY_SERVICE_SID
            ).verification_checks.create(to=e164_phone, code=clean_code)
        except TwilioRestException as exc:
            logger.warning(
                "Twilio Verify check failed for %s code=%s status=%s",
                masked,
                exc.code,
                exc.status,
            )
            if exc.code == 20404:
                raise BadRequestException("Invalid or expired verification code. Please request a new code.") from exc
            elif exc.code == 60202:
                raise BadRequestException("Maximum verification attempts reached. Please request a new code.") from exc
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc
        except Exception as exc:
            logger.warning("Twilio verify client error for %s: %s", masked, type(exc).__name__)
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc

        if result.status != "approved":
            logger.warning("Twilio Verify status was '%s' (not approved) for %s", result.status, masked)
            raise BadRequestException("Invalid verification code. Please check the code and try again.")

        logger.info("Twilio Verify check approved for %s", masked)
        return True
