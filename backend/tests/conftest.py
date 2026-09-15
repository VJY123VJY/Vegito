"""
conftest.py — pytest fixtures for Vegito API tests.

Uses the existing development DB for integration tests.
Wraps each test in a transaction that is rolled back after each test,
preventing data leakage between tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.main import app
from app.database import get_db, Base
from app.config import settings


@pytest.fixture(scope="session")
def test_engine():
    """Create a test engine using the same database URL."""
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db(test_engine):
    """
    Provide a database session that wraps each test in a savepoint/rollback.
    This ensures test isolation without needing a separate test database.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    TestingSessionLocal = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = TestingSessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db: Session):
    """
    FastAPI TestClient with database dependency overridden to use the
    rollback-wrapped test session.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def direct_client():
    """
    TestClient using the real database (for read-only tests like health checks).
    """
    with TestClient(app) as c:
        yield c
