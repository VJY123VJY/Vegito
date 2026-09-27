"""Add secure delivery handoff and pickup verification columns

Revision ID: 0005_secure_handoff_otp
Revises: 0004_urgent_failure
Create Date: 2026-09-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005_secure_handoff_otp"
down_revision: Union[str, None] = "0004_urgent_failure"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # orders table
    op.add_column("orders", sa.Column("pickup_otp_hash", sa.String(255), nullable=True))
    op.add_column("orders", sa.Column("pickup_otp_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("pickup_otp_attempts", sa.Integer(), server_default=sa.text("0"), nullable=False))
    op.add_column("orders", sa.Column("pickup_otp_max_attempts", sa.Integer(), server_default=sa.text("5"), nullable=False))

    # delivery_tasks table
    op.add_column("delivery_tasks", sa.Column("pickup_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("delivery_tasks", sa.Column("delivery_otp_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("delivery_tasks", sa.Column("delivery_otp_attempts", sa.Integer(), server_default=sa.text("0"), nullable=False))
    op.add_column("delivery_tasks", sa.Column("delivery_otp_max_attempts", sa.Integer(), server_default=sa.text("5"), nullable=False))


def downgrade() -> None:
    op.drop_column("orders", "pickup_otp_hash")
    op.drop_column("orders", "pickup_otp_expires_at")
    op.drop_column("orders", "pickup_otp_attempts")
    op.drop_column("orders", "pickup_otp_max_attempts")

    op.drop_column("delivery_tasks", "pickup_verified")
    op.drop_column("delivery_tasks", "delivery_otp_expires_at")
    op.drop_column("delivery_tasks", "delivery_otp_attempts")
    op.drop_column("delivery_tasks", "delivery_otp_max_attempts")
