"""baseline schema

Revision ID: 0001_baseline
Revises: 
Create Date: 2026-09-15 10:40:00.000000

Baseline migration representing the existing 30 tables in vegito_db.
For an existing database, run:
    alembic stamp head
to establish this baseline without re-running DDL on existing tables.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_baseline'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline migration for existing database.
    # When deployed against an existing vegito_db database, stamp head is used.
    pass


def downgrade() -> None:
    pass
