import datetime
import logging
from typing import Tuple, Optional
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client
from sqlalchemy.orm import Session
from app.config import settings
from app.models.otp_verification import OtpVerification
from app.core.security import hash_otp, verify_otp_hash
from app.utils.otp import generate_otp
from app.core.exceptions import BadRequestException

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
    def send_otp(db: Session, phone: str) -> Tuple[Optional[OtpVerification], Optional[str]]:
        """
        Sends an OTP through Twilio Verify when configured. Twilio owns OTP
        generation, expiry, and verification; no plaintext OTP is persisted.
        The legacy hashed-table path remains available only without Twilio
        configuration for local development compatibility.
        """
        is_test_mode = getattr(settings, "OTP_TEST_MODE", False) or getattr(settings, "OTP_DEV_MODE", False)
        if is_test_mode:
            logger.info("TEST OTP MODE ACTIVE: Generated development OTP %s for %s", settings.OTP_DEV_CODE, phone)
            otp_code = settings.OTP_DEV_CODE
            otp_hash = hash_otp(phone, otp_code)
            expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
                minutes=settings.OTP_EXPIRE_MINUTES
            )
            verification = None
            if db is not None:
                db.query(OtpVerification).filter(
                    OtpVerification.phone == phone,
                    OtpVerification.verified_at.is_(None),
                ).delete()
                verification = OtpVerification(
                    phone=phone,
                    otp_hash=otp_hash,
                    expires_at=expires_at,
                    attempts=0,
                )
                db.add(verification)
                db.commit()
                db.refresh(verification)
            return verification, otp_code

        if OtpService.is_twilio_configured():
            try:
                OtpService._twilio_client().verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verifications.create(to=OtpService.to_e164(phone), channel="sms")
            except TwilioRestException as exc:
                logger.warning(
                    "Twilio Verify send failed code=%s status=%s message=%s",
                    exc.code,
                    exc.status,
                    exc.msg,
                )
                raise BadRequestException(f"Twilio error {exc.code}: {exc.msg}") from exc
            return None, None

        otp_code = generate_otp()
        otp_hash = hash_otp(phone, otp_code)
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            minutes=settings.OTP_EXPIRE_MINUTES
        )

        # Invalidate/cleanup any existing unverified OTPs for this phone
        db.query(OtpVerification).filter(
            OtpVerification.phone == phone,
            OtpVerification.verified_at.is_(None),
        ).delete()

        verification = OtpVerification(
            phone=phone,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
        )
        db.add(verification)
        db.commit()
        db.refresh(verification)

        return verification, otp_code

    @staticmethod
    def verify_otp(db: Session, phone: str, otp_code: str) -> bool:
        """
        Verifies the provided OTP against the latest active verification record.
        Raises BadRequestException if invalid, expired, or max attempts exceeded.
        """
        is_test_mode = getattr(settings, "OTP_TEST_MODE", False) or getattr(settings, "OTP_DEV_MODE", False)
        if is_test_mode and otp_code == getattr(settings, "OTP_DEV_CODE", "123456"):
            logger.info("TEST OTP MODE ACTIVE: Verified dev OTP %s for %s", otp_code, phone)
            if db is not None:
                verification = (
                    db.query(OtpVerification)
                    .filter(
                        OtpVerification.phone == phone,
                        OtpVerification.verified_at.is_(None),
                    )
                    .order_by(OtpVerification.created_at.desc())
                    .first()
                )
                if verification:
                    verification.verified_at = datetime.datetime.now(datetime.timezone.utc)
                    db.commit()
            return True

        if OtpService.is_twilio_configured():
            try:
                result = OtpService._twilio_client().verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verification_checks.create(to=OtpService.to_e164(phone), code=otp_code)
            except TwilioRestException as exc:
                logger.warning(
                    "Twilio Verify check failed code=%s status=%s message=%s",
                    exc.code,
                    exc.status,
                    exc.msg,
                )
                raise BadRequestException(f"Twilio error {exc.code}: {exc.msg}") from exc
            if result.status != "approved":
                raise BadRequestException("Invalid or expired OTP code.")
            return True

        verification = (
            db.query(OtpVerification)
            .filter(
                OtpVerification.phone == phone,
                OtpVerification.verified_at.is_(None),
            )
            .order_by(OtpVerification.created_at.desc())
            .first()
        )

        if not verification:
            raise BadRequestException("No active OTP request found for this phone number. Please request a new OTP.")

        # Check attempts
        if verification.attempts >= settings.OTP_MAX_ATTEMPTS:
            raise BadRequestException("Maximum OTP verification attempts exceeded. Please request a new OTP.")

        # Check expiration
        now = datetime.datetime.now(datetime.timezone.utc)
        # Normalize timezone if needed
        exp = verification.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=datetime.timezone.utc)
        if now > exp:
            raise BadRequestException("OTP has expired. Please request a new OTP.")

        # Verify hash
        is_valid = verify_otp_hash(phone, otp_code, verification.otp_hash)
        if not is_valid:
            verification.attempts += 1
            db.commit()
            remaining = settings.OTP_MAX_ATTEMPTS - verification.attempts
            raise BadRequestException(
                f"Invalid OTP code. {remaining} attempt(s) remaining."
            )

        # Mark as verified
        verification.verified_at = now
        db.commit()
        return True
