"""
database.py — SQLAlchemy 2.x database engine, session factory, and base class.

Uses psycopg 3 driver with PostgreSQL 18.

DATABASE_URL is loaded from app.config.settings.

Vercel / serverless notes
--------------------------

Vercel Python Functions are stateless lambdas. Each cold start is a fresh
process, so a persistent connection pool has no value and actively causes
problems (leaked connections after the process is frozen).

We therefore use NullPool in production/serverless environments so that
every request opens and immediately closes its own connection. The
pool_pre_ping remains enabled to detect stale connections on first use.

SQLAlchemy dialect selection
-----------------------------

The `_get_db_url()` helper normalises any bare `postgresql://` or
`postgres://` URL (as supplied by Neon or Vercel env-var presets) to
`postgresql+psycopg://`, which explicitly selects the psycopg 3 dialect.

This guard is a safety net; the Vercel DATABASE_URL env var should ideally
already use the `postgresql+psycopg://` scheme.
"""

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from sqlalchemy.pool import NullPool

from app.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_db_url() -> str:
    """
    Return the database URL, ensuring the psycopg 3 dialect prefix is used.

    Normalises bare `postgresql://` / `postgres://` to
    `postgresql+psycopg://` so SQLAlchemy always loads the psycopg 3
    dialect instead of falling back to psycopg2.
    """
    url = settings.DATABASE_URL

    if not url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Add it to your Vercel project environment variables."
        )

    for bare_scheme in ("postgresql://", "postgres://"):
        if url.startswith(bare_scheme):
            url = "postgresql+psycopg://" + url[len(bare_scheme):]
            break

    # -----------------------------------------------------------------------
    # TEMPORARY DIAGNOSTIC LOGGING
    # -----------------------------------------------------------------------
    # Print only hostname:port.
    # Password and username are NOT printed.
    print("=== DB URL HOST CHECK ===")
    print(url.split("@")[-1].split("/")[0])
    # -----------------------------------------------------------------------

    return url


def _is_serverless() -> bool:
    """Return True when running inside a Vercel Lambda (or any AWS Lambda)."""
    return bool(
        os.environ.get("VERCEL")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    )


# ---------------------------------------------------------------------------
# Engine configuration
# ---------------------------------------------------------------------------

# Use NullPool in serverless environments (Vercel) to avoid connection leaks.
# Each request opens its own connection and closes it immediately after.
# Use a real pool only in long-running server deployments (Railway, local).

_pool_kwargs = (
    {"poolclass": NullPool}
    if _is_serverless()
    else {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20,
    }
)


engine = create_engine(
    _get_db_url(),
    echo=False,
    **_pool_kwargs,
)


def ensure_database_schema(db_engine) -> None:
    """
    Idempotent schema guard. Ensures all required columns exist in PostgreSQL
    without dropping or truncating tables. Safe across serverless cold starts.
    """
    try:
        from sqlalchemy import text
        with db_engine.begin() as conn:
            # orders columns
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_delivery_address TEXT;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(10);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp_hash VARCHAR(255);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp_created_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp_verified_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp_attempts INTEGER NOT NULL DEFAULT 0;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp_max_attempts INTEGER NOT NULL DEFAULT 5;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'RETAIL';"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_id BIGINT;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_delivery_date DATE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_delivery_window VARCHAR(50);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_total NUMERIC(12, 2);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_notes TEXT;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_delivery_fee NUMERIC(10, 2);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_status VARCHAR(30);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMP WITHOUT TIME ZONE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMP WITHOUT TIME ZONE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);"))

            # products columns
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER DEFAULT 7;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS freshness_category VARCHAR(50);"))

            # order_items columns
            conn.execute(text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quoted_unit_price NUMERIC(10, 2);"))
            conn.execute(text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quoted_subtotal NUMERIC(12, 2);"))
            conn.execute(text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS seller_notes VARCHAR(255);"))

            # seller_products columns
            conn.execute(text("ALTER TABLE seller_products ADD COLUMN IF NOT EXISTS added_date DATE;"))
            conn.execute(text("ALTER TABLE seller_products ADD COLUMN IF NOT EXISTS added_time TIME WITHOUT TIME ZONE;"))
            conn.execute(text("ALTER TABLE seller_products ADD COLUMN IF NOT EXISTS harvest_date DATE;"))
            conn.execute(text("ALTER TABLE seller_products ADD COLUMN IF NOT EXISTS harvest_time TIME WITHOUT TIME ZONE;"))
            conn.execute(text("ALTER TABLE seller_products ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(100);"))
            conn.execute(text("ALTER TABLE seller_products ADD COLUMN IF NOT EXISTS origin VARCHAR(150);"))

            # delivery_tasks columns
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(100);"))
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS pickup_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS pickup_verified BOOLEAN NOT NULL DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS delivery_otp_attempts INTEGER NOT NULL DEFAULT 0;"))
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS delivery_otp_max_attempts INTEGER NOT NULL DEFAULT 5;"))

            # seller_profiles KYC columns
            conn.execute(text("ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT';"))
            conn.execute(text("ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE;"))

            # delivery_partners KYC columns
            conn.execute(text("ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT';"))
            conn.execute(text("ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE;"))

            # KYC tables
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS seller_kyc (
                    id BIGSERIAL PRIMARY KEY,
                    seller_profile_id BIGINT UNIQUE NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
                    business_type VARCHAR(50) NOT NULL DEFAULT 'RETAIL_STORE',
                    business_proof_type VARCHAR(50),
                    business_proof_number VARCHAR(100),
                    business_proof_file VARCHAR(500),
                    shop_front_photo VARCHAR(500),
                    shop_interior_photo VARCHAR(500),
                    shop_signage_photo VARCHAR(500),
                    id_proof_type VARCHAR(50),
                    id_proof_number_masked VARCHAR(100),
                    id_proof_file VARCHAR(500),
                    selfie_file VARCHAR(500),
                    liveness_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
                    bank_account_holder VARCHAR(100),
                    bank_account_number_masked VARCHAR(50),
                    bank_ifsc VARCHAR(20),
                    bank_name VARCHAR(100),
                    bank_upi_id VARCHAR(100),
                    rejection_reason TEXT,
                    reupload_notes TEXT,
                    submitted_at TIMESTAMP WITH TIME ZONE,
                    reviewed_at TIMESTAMP WITH TIME ZONE,
                    reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS delivery_partner_kyc (
                    id BIGSERIAL PRIMARY KEY,
                    delivery_partner_id BIGINT UNIQUE NOT NULL REFERENCES delivery_partners(id) ON DELETE CASCADE,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
                    full_name VARCHAR(100),
                    dob VARCHAR(20),
                    emergency_contact_name VARCHAR(100),
                    emergency_contact_phone VARCHAR(20),
                    profile_photo VARCHAR(500),
                    selfie_file VARCHAR(500),
                    liveness_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
                    id_proof_type VARCHAR(50),
                    id_proof_number_masked VARCHAR(100),
                    id_proof_file VARCHAR(500),
                    driving_license_number VARCHAR(50),
                    driving_license_expiry VARCHAR(20),
                    driving_license_file VARCHAR(500),
                    vehicle_type VARCHAR(50) DEFAULT 'Motorcycle',
                    vehicle_number VARCHAR(30),
                    rc_book_file VARCHAR(500),
                    insurance_file VARCHAR(500),
                    operating_city VARCHAR(100) NOT NULL DEFAULT 'Solapur',
                    operating_zone VARCHAR(100),
                    bank_account_holder VARCHAR(100),
                    bank_account_number_masked VARCHAR(50),
                    bank_ifsc VARCHAR(20),
                    bank_upi_id VARCHAR(100),
                    rejection_reason TEXT,
                    reupload_notes TEXT,
                    submitted_at TIMESTAMP WITH TIME ZONE,
                    reviewed_at TIMESTAMP WITH TIME ZONE,
                    reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS kyc_audits (
                    id BIGSERIAL PRIMARY KEY,
                    kyc_type VARCHAR(30) NOT NULL,
                    target_id BIGINT NOT NULL,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                    previous_status VARCHAR(50),
                    new_status VARCHAR(50) NOT NULL,
                    decision VARCHAR(50) NOT NULL,
                    reason TEXT,
                    reupload_notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """))
    except Exception as exc:
        import logging
        logging.getLogger("vegito.db").warning(f"Schema safety check note: {exc}")


def _should_run_schema_sync() -> bool:
    import sys
    # Do not execute DDL on test suites or when schema sync is skipped
    if "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("SKIP_SCHEMA_SYNC") == "1":
        return False
    return True


if _should_run_schema_sync():
    ensure_database_schema(engine)



SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session and ensures proper closure.
    """
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()