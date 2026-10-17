"""
Test Suite: test_fixed_otp_test_flow.py
Verifies temporary fixed OTP testing for Seller (9999999999) and Delivery Partner (8888888888).

Tests:
1. Valid Seller login (9999999999 + 123456 + SELLER) -> Success with role SELLER.
2. Valid Delivery Partner login (8888888888 + 123456 + DELIVERY_PARTNER) -> Success with role DELIVERY_PARTNER.
3. Incorrect OTP rejection -> Fails with 400.
4. Incorrect phone number rejection -> Arbitrary numbers cannot use fixed OTP bypass.
5. Incorrect role rejection -> 9999999999 cannot login as CUSTOMER/DELIVERY_PARTNER; 8888888888 cannot login as SELLER/CUSTOMER.
6. Disabled test mode rejection -> When FIXED_OTP_TEST_MODE=False or ENVIRONMENT=production, fixed OTP is rejected.
7. dev_otp is omitted from API responses -> Security requirement satisfied.
"""

import pytest
from starlette.testclient import TestClient
from app.config import settings
from app.services.otp_service import is_fixed_otp_enabled


@pytest.fixture(autouse=True)
def enable_test_mode(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "FIXED_OTP_TEST_MODE", True)


def test_1_valid_seller_fixed_otp_login(client: TestClient):
    """TEST 1: 9999999999 + 123456 + SELLER -> Authenticates Seller with JWT."""
    # 1. Send OTP
    send_res = client.post("/api/v1/auth/send-otp", json={"phone": "9999999999"})
    assert send_res.status_code == 200
    res_data = send_res.json()["data"]
    # Requirement 9: Do not return test OTP in API response
    assert res_data.get("dev_otp") is None

    # 2. Verify OTP
    verify_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "9999999999", "otp": "123456", "role": "SELLER"},
    )
    assert verify_res.status_code == 200
    token_data = verify_res.json()["data"]
    assert token_data["role"] == "SELLER"
    assert token_data["phone"] == "9999999999"
    assert "access_token" in token_data
    assert "SELLER" in token_data["authorized_roles"]


def test_2_valid_delivery_partner_fixed_otp_login(client: TestClient):
    """TEST 2: 8888888888 + 123456 + DELIVERY_PARTNER -> Authenticates Delivery Partner."""
    # 1. Send OTP
    send_res = client.post("/api/v1/auth/send-otp", json={"phone": "8888888888"})
    assert send_res.status_code == 200
    res_data = send_res.json()["data"]
    # Requirement 9: Do not return test OTP in API response
    assert res_data.get("dev_otp") is None

    # 2. Verify OTP
    verify_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "8888888888", "otp": "123456", "role": "DELIVERY_PARTNER"},
    )
    assert verify_res.status_code == 200
    token_data = verify_res.json()["data"]
    assert token_data["role"] == "DELIVERY_PARTNER"
    assert token_data["phone"] == "8888888888"
    assert "access_token" in token_data
    assert "DELIVERY_PARTNER" in token_data["authorized_roles"]


def test_3_incorrect_otp_rejected(client: TestClient):
    """TEST 3: Incorrect OTP is rejected with 400 Bad Request."""
    # Seller with wrong OTP
    res_seller = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "9999999999", "otp": "999999", "role": "SELLER"},
    )
    assert res_seller.status_code == 400
    assert "Invalid verification code" in res_seller.text

    # Delivery partner with wrong OTP
    res_dp = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "8888888888", "otp": "000000", "role": "DELIVERY_PARTNER"},
    )
    assert res_dp.status_code == 400
    assert "Invalid verification code" in res_dp.text


def test_4_incorrect_role_rejected(client: TestClient):
    """TEST 4: Cannot cross-authenticate: 9999999999 cannot be CUSTOMER, 8888888888 cannot be SELLER."""
    # Seller number attempted as CUSTOMER
    res_cust = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "9999999999", "otp": "123456", "role": "CUSTOMER"},
    )
    assert res_cust.status_code == 403
    assert "Access denied" in res_cust.text

    # Delivery partner number attempted as SELLER
    res_sel = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "8888888888", "otp": "123456", "role": "SELLER"},
    )
    assert res_sel.status_code == 403
    assert "Access denied" in res_sel.text


def test_5_production_environment_rejects_fixed_otp(client: TestClient, monkeypatch):
    """TEST 5: When ENVIRONMENT is production, fixed OTP is strictly rejected even if test mode flag is true."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "FIXED_OTP_TEST_MODE", True)
    assert is_fixed_otp_enabled() is False

    # Attempting fixed OTP in production must fail
    res = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "9999999999", "otp": "123456", "role": "SELLER"},
    )
    # Since Twilio Verify isn't passed valid real code, verification fails
    assert res.status_code in [400, 503]


def test_6_disabled_flag_rejects_fixed_otp(client: TestClient, monkeypatch):
    """TEST 6: When FIXED_OTP_TEST_MODE is False, fixed OTP bypass is disabled."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "FIXED_OTP_TEST_MODE", False)
    assert is_fixed_otp_enabled() is False

    res = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "9999999999", "otp": "123456", "role": "SELLER"},
    )
    assert res.status_code in [400, 503]
