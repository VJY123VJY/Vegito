"""
database.py — SQLAlchemy 2.x database engine, session factory, and base class.

Uses psycopg 3 driver with PostgreSQL 18.
DATABASE_URL is loaded from app.config.settings.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from app.config import settings

# Engine configuration
engine = create_engine(
    settings.DATABASE_URL,
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
