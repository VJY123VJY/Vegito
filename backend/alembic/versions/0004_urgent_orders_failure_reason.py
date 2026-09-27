"""Add is_urgent to orders, failure_reason to delivery_tasks, pickup_at to delivery_tasks

Revision ID: 0004_urgent_orders_failure_reason
Revises: 0003_seller_availability
Create Date: 2026-09-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004_urgent_failure"
down_revision: Union[str, None] = "0003_seller_availability"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_urgent flag to orders (default False = not urgent)
    op.add_column(
        "orders",
        sa.Column("is_urgent", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )

    # Add failure_reason to delivery_tasks
    op.add_column(
        "delivery_tasks",
        sa.Column("failure_reason", sa.String(100), nullable=True),
    )

    # Add pickup_at to delivery_tasks — when delivery partner physically picks up from seller
    op.add_column(
        "delivery_tasks",
        sa.Column("pickup_at", sa.DateTime(), nullable=True),
    )

    # Add failed_at to delivery_tasks
    op.add_column(
        "delivery_tasks",
        sa.Column("failed_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "is_urgent")
    op.drop_column("delivery_tasks", "failure_reason")
    op.drop_column("delivery_tasks", "pickup_at")
    op.drop_column("delivery_tasks", "failed_at")
