"""Add firebase_uid column to users table

Revision ID: 0007_add_firebase_uid
Revises: 0006_kyc_and_order_updates
Create Date: 2026-10-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0007_add_firebase_uid"
down_revision: Union[str, Sequence[str], None] = ("0006_b2b_bulk_ordering", "0006_kyc_and_order_updates")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add firebase_uid to users safely
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [c["name"] for c in inspector.get_columns("users")]
    if "firebase_uid" not in existing_columns:
        op.add_column("users", sa.Column("firebase_uid", sa.String(128), nullable=True))
        op.create_index(op.f("ix_users_firebase_uid"), "users", ["firebase_uid"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_firebase_uid"), table_name="users")
    op.drop_column("users", "firebase_uid")
