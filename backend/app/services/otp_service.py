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
    def send_otp(phone: str) -> None:
        if not OtpService.is_twilio_configured():
            raise ServiceUnavailableException("Verification service is not configured.")

        try:
            OtpService._twilio_client().verify.v2.services(
                settings.TWILIO_VERIFY_SERVICE_SID
            ).verifications.create(to=OtpService.to_e164(phone), channel="sms")
        except TwilioRestException as exc:
            logger.warning(
                "Twilio Verify send failed code=%s status=%s",
                exc.code,
                exc.status,
            )
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc

    @staticmethod
    def verify_otp(phone: str, otp_code: str) -> bool:
        if not OtpService.is_twilio_configured():
            raise ServiceUnavailableException("Verification service is not configured.")

        try:
            result = OtpService._twilio_client().verify.v2.services(
                settings.TWILIO_VERIFY_SERVICE_SID
            ).verification_checks.create(to=OtpService.to_e164(phone), code=otp_code)
        except TwilioRestException as exc:
            logger.warning(
                "Twilio Verify check failed code=%s status=%s",
                exc.code,
                exc.status,
            )
            if exc.code == 20404:
                raise BadRequestException("Invalid or expired OTP code.") from exc
            raise ServiceUnavailableException(
                "Verification service is temporarily unavailable. Please try again."
            ) from exc

        if result.status != "approved":
            raise BadRequestException("Invalid or expired OTP code.")
        return True
