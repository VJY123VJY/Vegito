"""delivery locations and seller fulfillments

Revision ID: 0002_locations_fulfillments
Revises: 0001_baseline
Create Date: 2026-09-16 10:45:00.000000

Adds:
  1. delivery_partner_locations: Real-time and historical GPS coordinates
  2. order_seller_fulfillments: Multi-seller fulfillment status tracking per order
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002_locations_fulfillments"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. delivery_partner_locations
    op.create_table(
        "delivery_partner_locations",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "delivery_partner_id",
            sa.BigInteger(),
            sa.ForeignKey("delivery_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("accuracy_meters", sa.Numeric(6, 2), nullable=True),
        sa.Column("heading", sa.Numeric(5, 2), nullable=True),
        sa.Column("speed_kmh", sa.Numeric(6, 2), nullable=True),
        sa.Column("recorded_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_delivery_partner_locations_partner_id",
        "delivery_partner_locations",
        ["delivery_partner_id"],
    )
    op.create_index(
        "ix_delivery_partner_locations_recorded_at",
        "delivery_partner_locations",
        ["recorded_at"],
    )
    op.create_index(
        "ix_delivery_partner_locations_partner_time",
        "delivery_partner_locations",
        ["delivery_partner_id", "recorded_at"],
    )

    # 2. order_seller_fulfillments
    op.create_table(
        "order_seller_fulfillments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "order_id",
            sa.BigInteger(),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "seller_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(30), server_default="NEW", nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), server_default="0.00", nullable=False),
        sa.Column("seller_amount", sa.Numeric(12, 2), server_default="0.00", nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("packed_at", sa.DateTime(), nullable=True),
        sa.Column("ready_at", sa.DateTime(), nullable=True),
        sa.Column("rejected_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_order_seller_fulfillments_order_id",
        "order_seller_fulfillments",
        ["order_id"],
    )
    op.create_index(
        "ix_order_seller_fulfillments_seller_id",
        "order_seller_fulfillments",
        ["seller_id"],
    )
    op.create_index(
        "ix_order_seller_fulfillments_status",
        "order_seller_fulfillments",
        ["status"],
    )
    op.create_index(
        "ix_order_seller_fulfillments_order_seller",
        "order_seller_fulfillments",
        ["order_id", "seller_id"],
    )


def downgrade() -> None:
    op.drop_table("order_seller_fulfillments")
    op.drop_table("delivery_partner_locations")
