from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Liveness probe")
def health_check():
    """
    Basic liveness check — confirms the API process is running.
    Does NOT verify the database.
    """
    return {"status": "ok", "service": "Vegito API"}


@router.get("/health/db", summary="Database connectivity probe")
def health_db(db: Session = Depends(get_db)):
    """
    Database connectivity check — executes SELECT 1 against PostgreSQL.
    Returns 200 if the database is reachable, 500 otherwise.
    Never exposes the connection string or credentials in the response.
    """
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed. Check server logs for details.",
        )
