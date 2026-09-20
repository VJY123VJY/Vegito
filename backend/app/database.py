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
        "pool_size": 10,
        "max_overflow": 20,
    }
)


engine = create_engine(
    _get_db_url(),
    echo=False,
    **_pool_kwargs,
)


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