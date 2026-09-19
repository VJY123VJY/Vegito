"""
database.py — SQLAlchemy 2.x database engine, session factory, and base class.

Uses psycopg 3 driver with PostgreSQL 18.
DATABASE_URL is loaded from app.config.settings.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from app.config import settings


def _get_db_url() -> str:
    """
    Return the database URL, ensuring the psycopg 3 dialect prefix is used.

    Vercel (and Neon) often provide DATABASE_URL as ``postgresql://`` or
    ``postgres://`` without an explicit driver qualifier.  SQLAlchemy 2.x
    resolves a bare ``postgresql://`` URL to the psycopg2 dialect when
    psycopg2 is installed, which breaks deployments that intentionally use
    psycopg 3.

    This helper normalises the scheme to ``postgresql+psycopg://`` so the
    correct driver is always selected, regardless of how the environment
    variable is set in the deployment platform.
    """
    url = settings.DATABASE_URL
    for bare_scheme in ("postgresql://", "postgres://"):
        if url.startswith(bare_scheme):
            url = "postgresql+psycopg://" + url[len(bare_scheme):]
            break
    return url


# Engine configuration
engine = create_engine(
    _get_db_url(),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
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
