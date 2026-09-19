import os

from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    APP_NAME: str = "Vegito API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SERVICE_CITY: str = "Solapur"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5433/vegito_db"

    # Security
    JWT_SECRET_KEY: str = "super-secret-vegito-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OTP
    OTP_EXPIRE_MINUTES: int = 5
    OTP_DEV_MODE: bool = True
    OTP_TEST_MODE: bool = True
    OTP_DEV_CODE: str = "123456"
    OTP_MAX_ATTEMPTS: int = 5
    # Testing OTP for delivery partner pickup verification (DEVELOPMENT / TESTING ONLY).
    # In production, swap with dynamic cryptographic OTP generation per order.
    TEST_OTP: str = "123456"
    TEST_PICKUP_OTP: str = "123456"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""

    # Delivery Assignment Radius & Pricing Bands (KM -> INR)
    DELIVERY_ASSIGNMENT_RADIUS_KM: float = 15.0
    MIN_DELIVERY_RADIUS_KM: float = 0.0
    DELIVERY_MAX_DISTANCE_KM: float = 15.0
    DELIVERY_FEE_0_TO_1_KM: float = 20.0
    DELIVERY_FEE_1_TO_3_KM: float = 30.0
    DELIVERY_FEE_3_TO_5_KM: float = 40.0
    DELIVERY_FEE_5_TO_6_KM: float = 50.0
    DELIVERY_FEE_5_TO_7_KM: float = 50.0
    DELIVERY_FEE_5_TO_15_KM: float = 50.0

    # Google Business Profile Review URL
    GOOGLE_REVIEW_URL: str = "https://g.page/r/vegito-solapur/review"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Payments
    PAYMENT_PROVIDER: str = "mock"
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Mapbox & Location Integrations
    MAP_PROVIDER: str = "mapbox"
    MAP_API_KEY: str = ""
    MAPBOX_ACCESS_TOKEN: str = os.getenv("MAPBOX_ACCESS_TOKEN", "")
    S3_BUCKET: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
