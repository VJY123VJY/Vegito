import logging
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client
from app.config import settings
from app.core.exceptions import BadRequestException, ServiceUnavailableException

logger = logging.getLogger("vegito.auth.otp")


class OtpService:
    @staticmethod
    def is_twilio_configured() -> bool:
        return all(
            (
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN,
                settings.TWILIO_VERIFY_SERVICE_SID,
            )
        )

    @staticmethod
    def to_e164(phone: str) -> str:
        return phone if phone.startswith("+") else f"+91{phone}"

    @staticmethod
    def _twilio_client() -> Client:
        return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    @staticmethod
    def send_otp(phone: str) -> dict:
        if not OtpService.is_twilio_configured():
            raise ServiceUnavailableException("Verification service is not configured.")

        is_test_mode = getattr(settings, "OTP_TEST_MODE", False) or getattr(settings, "OTP_DEV_MODE", False)
        dev_code = getattr(settings, "OTP_DEV_CODE", "123456")

        try:
            OtpService._twilio_client().verify.v2.services(
                settings.TWILIO_VERIFY_SERVICE_SID
            ).verifications.create(to=OtpService.to_e164(phone), channel="sms")
            return {"dev_otp": dev_code if is_test_mode else None, "fallback": False}
        except TwilioRestException as exc:
            logger.warning(
                "Twilio Verify send failed code=%s status=%s message=%s",
                exc.code,
                exc.status,
                exc.msg,
            )
            # If test/dev mode is active, fall back gracefully to dev OTP (e.g. for trial accounts)
            if is_test_mode:
                logger.info("Falling back to dev OTP %s for %s", dev_code, phone)
                return {"dev_otp": dev_code, "fallback": True}
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc
        except Exception as exc:
            logger.warning("Twilio client error: %s", exc)
            if is_test_mode:
                return {"dev_otp": dev_code, "fallback": True}
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc

    @staticmethod
    def verify_otp(phone: str, otp_code: str) -> bool:
        if not OtpService.is_twilio_configured():
            raise ServiceUnavailableException("Verification service is not configured.")

        is_test_mode = getattr(settings, "OTP_TEST_MODE", False) or getattr(settings, "OTP_DEV_MODE", False)
        dev_code = getattr(settings, "OTP_DEV_CODE", "123456")
        clean_code = (otp_code or "").strip()

        # In test / dev mode, allow the configured test code
        if is_test_mode and clean_code == dev_code:
            logger.info("OTP verified via dev/test code for %s", phone)
            return True

        try:
            result = OtpService._twilio_client().verify.v2.services(
                settings.TWILIO_VERIFY_SERVICE_SID
            ).verification_checks.create(to=OtpService.to_e164(phone), code=clean_code)
        except TwilioRestException as exc:
            logger.warning(
                "Twilio Verify check failed code=%s status=%s",
                exc.code,
                exc.status,
            )
            if is_test_mode and clean_code == dev_code:
                return True
            if exc.code == 20404:
                raise BadRequestException("Invalid or expired OTP code.") from exc
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc

        if result.status != "approved":
            if is_test_mode and clean_code == dev_code:
                return True
            raise BadRequestException("Invalid or expired OTP code.")
        return True
