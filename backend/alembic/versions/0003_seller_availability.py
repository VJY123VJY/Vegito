"""add is_available to seller_profiles

Revision ID: 0003_seller_availability
Revises: 0002_locations_fulfillments
Create Date: 2026-09-18 11:36:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_seller_availability"
down_revision: Union[str, None] = "0002_locations_fulfillments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "seller_profiles",
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("seller_profiles", "is_available")
