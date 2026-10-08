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
    Initializes Firebase Admin SDK singleton safely.
    Supports:
    - FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON string for cloud/Railway/env vars)
    - FIREBASE_CREDENTIALS_PATH (path to service account JSON file)
    - GOOGLE_APPLICATION_CREDENTIALS environment variable
    - Default application credentials / Project ID options
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

        options: Dict[str, Any] = {}
        if settings.FIREBASE_PROJECT_ID:
            options["projectId"] = settings.FIREBASE_PROJECT_ID

        if cred is not None:
            _firebase_app = firebase_admin.initialize_app(cred, options=options if options else None)
        else:
            # Initialize with project ID (works in environments where default credentials exist or public key verification is used)
            _firebase_app = firebase_admin.initialize_app(options=options if options else None)
            logger.info("Firebase Admin initialized with project options: %s", options)

        return _firebase_app
    except Exception as e:
        logger.error("Error initializing Firebase Admin SDK: %s", str(e))
        return None


def verify_firebase_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifies a Firebase ID token using Firebase Admin SDK.
    Returns dictionary with:
    - uid: Firebase UID
    - phone_number: Verified phone number (E.164 format, e.g. +919876543210)
    - email: Optional email if present in token
    - decoded_token: Full decoded payload
    Raises UnauthorizedException on any verification error.
    """
    if not id_token or not id_token.strip():
        raise UnauthorizedException("Firebase ID token is missing or empty.")

    app = initialize_firebase_admin()
    if app is None:
        raise UnauthorizedException(
            "Firebase Admin SDK is not properly configured on the server. Please contact support."
        )

    try:
        from firebase_admin import auth

        decoded_token = auth.verify_id_token(id_token.strip(), check_revoked=False)
        uid = decoded_token.get("uid")
        if not uid:
            raise UnauthorizedException("Invalid Firebase token: UID missing.")

        phone_number = decoded_token.get("phone_number")
        email = decoded_token.get("email")

        return {
            "uid": uid,
            "phone_number": phone_number,
            "email": email,
            "decoded_token": decoded_token,
        }
    except Exception as exc:
        err_msg = str(exc)
        logger.warning("Firebase ID token verification failed: %s", err_msg)
        if "expired" in err_msg.lower():
            raise UnauthorizedException("Firebase session has expired. Please log in again.")
        elif "revoked" in err_msg.lower():
            raise UnauthorizedException("Firebase session has been revoked. Please log in again.")
        raise UnauthorizedException("Invalid Firebase authentication token.")
