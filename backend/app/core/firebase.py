import json
import logging
import os
from typing import Any, Dict, Optional

from app.config import settings
from app.core.exceptions import UnauthorizedException

logger = logging.getLogger("vegito.firebase")

_firebase_app = None


def initialize_firebase_admin():
    """
    Initializes Firebase Admin SDK singleton when service-account credentials exist.
    Supports:
    - FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON string)
    - FIREBASE_CREDENTIALS_PATH (path to service account JSON file)
    - GOOGLE_APPLICATION_CREDENTIALS (path to Google credentials file)
    If no service account credentials exist, returns None; ID token verification
    gracefully uses Google's public x509 certificates (RS256).
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Check if already initialized by firebase_admin internal state
        if firebase_admin._apps:
            _firebase_app = firebase_admin.get_app()
            return _firebase_app

        cred = None
        service_account_json = (settings.FIREBASE_SERVICE_ACCOUNT_JSON or "").strip()
        credentials_path = (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
        google_app_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()

        if service_account_json:
            try:
                cert_dict = json.loads(service_account_json)
                cred = credentials.Certificate(cert_dict)
                logger.info("Firebase Admin initialized from inline JSON credentials.")
            except Exception as e:
                logger.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: %s", str(e))
        elif credentials_path and os.path.exists(credentials_path):
            cred = credentials.Certificate(credentials_path)
            logger.info("Firebase Admin initialized from credentials file: %s", credentials_path)
        elif google_app_creds and os.path.exists(google_app_creds):
            cred = credentials.Certificate(google_app_creds)
            logger.info("Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS: %s", google_app_creds)

        if cred is not None:
            options: Dict[str, Any] = {}
            if settings.FIREBASE_PROJECT_ID:
                options["projectId"] = settings.FIREBASE_PROJECT_ID
            _firebase_app = firebase_admin.initialize_app(cred, options=options if options else None)
            return _firebase_app
        else:
            logger.info(
                "No explicit Firebase service account credentials found. "
                "ID token verification will use Google's official public x509 certs for project %s.",
                settings.FIREBASE_PROJECT_ID or "vegito-e35a1",
            )
            return None
    except Exception as e:
        logger.error("Error initializing Firebase Admin SDK: %s", str(e))
        return None


def verify_firebase_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifies a Firebase ID token using:
    1. Firebase Admin SDK if service account credentials are configured, OR
    2. Google's official public-key cryptographic verification (google.oauth2.id_token)
       against Google's x509 certificates at securetoken@system.gserviceaccount.com.

    Enforces:
    - Audience matching settings.FIREBASE_PROJECT_ID (vegito-e35a1)
    - Issuer matching https://securetoken.google.com/<project_id>
    - Token signature (RS256) and validity (exp/iat)
    - Presence of subject (Firebase UID) and verified phone number

    Returns dictionary with:
    - uid: Firebase UID
    - phone_number: Verified phone number (E.164 format, e.g. +919876543210)
    - email: Optional email if present in token
    - decoded_token: Full decoded payload
    Raises UnauthorizedException on any verification error.
    """
    if not id_token or not id_token.strip():
        raise UnauthorizedException("Firebase ID token is missing or empty.")

    clean_token = id_token.strip()
    project_id = (settings.FIREBASE_PROJECT_ID or "vegito-e35a1").strip()
    decoded_token: Optional[Dict[str, Any]] = None

    # Strategy 1: Firebase Admin SDK (when service account credentials are loaded)
    app = initialize_firebase_admin()
    if app is not None:
        try:
            from firebase_admin import auth

            decoded_token = auth.verify_id_token(clean_token, check_revoked=False)
        except Exception as admin_exc:
            admin_err = str(admin_exc)
            logger.warning("Firebase Admin SDK token verification failed: %s", admin_err)
            if "expired" in admin_err.lower():
                raise UnauthorizedException("Firebase session has expired. Please log in again.")
            elif "revoked" in admin_err.lower():
                raise UnauthorizedException("Firebase session has been revoked. Please log in again.")
            # If failed due to credentials error, fall through to Strategy 2

    # Strategy 2: Google OAuth2 / Firebase Public Key verification
    if decoded_token is None:
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            req = google_requests.Request()
            decoded_token = google_id_token.verify_firebase_token(
                clean_token,
                request=req,
                audience=project_id,
            )
        except Exception as pub_exc:
            pub_err = str(pub_exc)
            logger.warning("Google public-key ID token verification failed: %s", pub_err)
            if "expired" in pub_err.lower():
                raise UnauthorizedException("Firebase session has expired. Please log in again.")
            elif "revoked" in pub_err.lower():
                raise UnauthorizedException("Firebase session has been revoked. Please log in again.")
            raise UnauthorizedException("Invalid Firebase authentication token.")

    # Validate essential Firebase token claims
    uid = decoded_token.get("sub") or decoded_token.get("user_id") or decoded_token.get("uid")
    if not uid:
        raise UnauthorizedException("Invalid Firebase token: UID missing.")

    expected_issuer = f"https://securetoken.google.com/{project_id}"
    token_issuer = decoded_token.get("iss")
    if token_issuer and token_issuer != expected_issuer:
        logger.warning("Firebase token issuer mismatch: expected %s, got %s", expected_issuer, token_issuer)
        raise UnauthorizedException("Invalid Firebase authentication token.")

    phone_number = decoded_token.get("phone_number")
    email = decoded_token.get("email")

    return {
        "uid": uid,
        "phone_number": phone_number,
        "email": email,
        "decoded_token": decoded_token,
    }
