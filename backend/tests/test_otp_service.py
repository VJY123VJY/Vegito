from types import SimpleNamespace

import pytest
from twilio.base.exceptions import TwilioRestException

from app.core.exceptions import BadRequestException
from app.services.otp_service import OtpService


class FakeVerifications:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(status="pending")


class FakeVerificationChecks:
    def __init__(self, status):
        self.status = status
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(status=self.status)


class FakeService:
    def __init__(self, verification_status="approved"):
        self.verifications = FakeVerifications()
        self.verification_checks = FakeVerificationChecks(verification_status)
        self.v2 = SimpleNamespace(services=lambda _: self)


def test_twilio_send_uses_e164_and_does_not_return_plaintext(monkeypatch):
    fake_service = FakeService()
    monkeypatch.setattr(OtpService, "is_twilio_configured", staticmethod(lambda: True))
    monkeypatch.setattr(OtpService, "_twilio_client", staticmethod(lambda: SimpleNamespace(verify=fake_service)))

    record, otp = OtpService.send_otp(None, "9876543210")

    assert record is None
    assert otp is None
    assert fake_service.verifications.calls == [{"to": "+919876543210", "channel": "sms"}]


def test_twilio_verify_accepts_only_approved(monkeypatch):
    fake_service = FakeService("approved")
    monkeypatch.setattr(OtpService, "is_twilio_configured", staticmethod(lambda: True))
    monkeypatch.setattr(OtpService, "_twilio_client", staticmethod(lambda: SimpleNamespace(verify=fake_service)))

    assert OtpService.verify_otp(None, "9876543210", "123456") is True
    assert fake_service.verification_checks.calls == [{"to": "+919876543210", "code": "123456"}]


def test_twilio_verify_rejects_non_approved(monkeypatch):
    fake_service = FakeService("pending")
    monkeypatch.setattr(OtpService, "is_twilio_configured", staticmethod(lambda: True))
    monkeypatch.setattr(OtpService, "_twilio_client", staticmethod(lambda: SimpleNamespace(verify=fake_service)))

    with pytest.raises(BadRequestException, match="Invalid or expired OTP"):
        OtpService.verify_otp(None, "9876543210", "123456")


def test_twilio_send_returns_safe_provider_diagnostic(monkeypatch):
    provider_error = TwilioRestException(400, "/Verify", "The destination is not permitted", code=21608)
    fake_service = SimpleNamespace(
        v2=SimpleNamespace(
            services=lambda _: SimpleNamespace(
                verifications=SimpleNamespace(create=lambda **_: (_ for _ in ()).throw(provider_error))
            )
        )
    )
    monkeypatch.setattr(OtpService, "is_twilio_configured", staticmethod(lambda: True))
    monkeypatch.setattr(OtpService, "_twilio_client", staticmethod(lambda: SimpleNamespace(verify=fake_service)))

    with pytest.raises(BadRequestException, match="Twilio error 21608"):
        OtpService.send_otp(None, "9876543210")
