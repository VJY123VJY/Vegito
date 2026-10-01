"""Add B2B bulk ordering tables, pricing rules, quotes, and order extensions

Revision ID: 0006_b2b_bulk_ordering
Revises: 0005_secure_handoff_otp
Create Date: 2026-10-01

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0006_b2b_bulk_ordering"
down_revision: Union[str, None] = "0005_secure_handoff_otp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. business_profiles table
    op.create_table(
        "business_profiles",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("business_name", sa.String(150), nullable=False),
        sa.Column("business_type", sa.String(50), nullable=False),
        sa.Column("contact_person", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("business_address", sa.Text(), nullable=False),
        sa.Column("delivery_address", sa.Text(), nullable=False),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("preferred_delivery_time", sa.String(50), nullable=True),
        sa.Column("payment_preference", sa.String(50), server_default="UPI", nullable=False),
        sa.Column("credit_limit", sa.Numeric(12, 2), server_default="0.00", nullable=False),
        sa.Column("credit_balance", sa.Numeric(12, 2), server_default="0.00", nullable=False),
        sa.Column("is_approved", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # 2. bulk_pricing_rules table
    op.create_table(
        "bulk_pricing_rules",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("seller_product_id", sa.BigInteger(), sa.ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("min_quantity", sa.Numeric(10, 3), nullable=False),
        sa.Column("max_quantity", sa.Numeric(10, 3), nullable=True),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount_percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # 3. orders table extensions
    op.add_column("orders", sa.Column("order_type", sa.String(20), server_default="RETAIL", nullable=False))
    op.create_index("ix_orders_order_type", "orders", ["order_type"])
    op.add_column("orders", sa.Column("business_id", sa.BigInteger(), sa.ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_orders_business_id", "orders", ["business_id"])
    op.add_column("orders", sa.Column("requested_delivery_date", sa.Date(), nullable=True))
    op.create_index("ix_orders_requested_delivery_date", "orders", ["requested_delivery_date"])
    op.add_column("orders", sa.Column("requested_delivery_window", sa.String(50), nullable=True))
    op.add_column("orders", sa.Column("quote_total", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("quote_notes", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("quote_delivery_fee", sa.Numeric(10, 2), nullable=True))
    op.add_column("orders", sa.Column("quote_status", sa.String(30), nullable=True))
    op.create_index("ix_orders_quote_status", "orders", ["quote_status"])
    op.add_column("orders", sa.Column("quote_sent_at", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("quote_expires_at", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("idempotency_key", sa.String(100), nullable=True))
    op.create_index("ix_orders_idempotency_key", "orders", ["idempotency_key"])

    # 4. order_items table extensions
    op.add_column("order_items", sa.Column("quoted_unit_price", sa.Numeric(10, 2), nullable=True))
    op.add_column("order_items", sa.Column("quoted_subtotal", sa.Numeric(12, 2), nullable=True))
    op.add_column("order_items", sa.Column("seller_notes", sa.Text(), nullable=True))

    # 5. bulk_cart_items table
    op.create_table(
        "bulk_cart_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("seller_product_id", sa.BigInteger(), sa.ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("quantity", sa.Numeric(10, 3), nullable=False),
        sa.Column("unit", sa.String(30), server_default="KG", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "seller_product_id", name="uq_bulk_cart_items_user_seller_product"),
    )

    # 6. saved_shopping_lists and items
    op.create_table(
        "saved_shopping_lists",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "saved_shopping_list_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("list_id", sa.BigInteger(), sa.ForeignKey("saved_shopping_lists.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("seller_product_id", sa.BigInteger(), sa.ForeignKey("seller_products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 3), nullable=False),
        sa.Column("unit", sa.String(30), nullable=False),
    )

    # 7. recurring_bulk_orders and items
    op.create_table(
        "recurring_bulk_orders",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("business_id", sa.BigInteger(), sa.ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("frequency", sa.String(30), server_default="DAILY", nullable=False),
        sa.Column("delivery_time_window", sa.String(50), nullable=False),
        sa.Column("address_id", sa.BigInteger(), sa.ForeignKey("addresses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("seller_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("next_run_date", sa.Date(), nullable=False),
        sa.Column("last_run_date", sa.Date(), nullable=True),
        sa.Column("special_instructions", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "recurring_bulk_order_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("recurring_order_id", sa.BigInteger(), sa.ForeignKey("recurring_bulk_orders.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("seller_product_id", sa.BigInteger(), sa.ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 3), nullable=False),
        sa.Column("unit", sa.String(30), nullable=False),
    )

    # 8. b2b_invoices
    op.create_table(
        "b2b_invoices",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("invoice_number", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("order_id", sa.BigInteger(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("business_id", sa.BigInteger(), sa.ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("business_name", sa.String(150), nullable=False),
        sa.Column("business_address", sa.Text(), nullable=False),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("seller_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("seller_name", sa.String(150), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(12, 2), server_default="0.00", nullable=False),
        sa.Column("delivery_fee", sa.Numeric(12, 2), server_default="0.00", nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_status", sa.String(30), server_default="PENDING", nullable=False),
        sa.Column("payment_method", sa.String(30), server_default="COD", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("b2b_invoices")
    op.drop_table("recurring_bulk_order_items")
    op.drop_table("recurring_bulk_orders")
    op.drop_table("saved_shopping_list_items")
    op.drop_table("saved_shopping_lists")
    op.drop_table("bulk_cart_items")

    op.drop_column("order_items", "seller_notes")
    op.drop_column("order_items", "quoted_subtotal")
    op.drop_column("order_items", "quoted_unit_price")

    op.drop_index("ix_orders_idempotency_key", table_name="orders")
    op.drop_column("orders", "idempotency_key")
    op.drop_column("orders", "quote_expires_at")
    op.drop_column("orders", "quote_sent_at")
    op.drop_index("ix_orders_quote_status", table_name="orders")
    op.drop_column("orders", "quote_status")
    op.drop_column("orders", "quote_delivery_fee")
    op.drop_column("orders", "quote_notes")
    op.drop_column("orders", "quote_total")
    op.drop_column("orders", "requested_delivery_window")
    op.drop_index("ix_orders_requested_delivery_date", table_name="orders")
    op.drop_column("orders", "requested_delivery_date")
    op.drop_index("ix_orders_business_id", table_name="orders")
    op.drop_column("orders", "business_id")
    op.drop_index("ix_orders_order_type", table_name="orders")
    op.drop_column("orders", "order_type")

    op.drop_table("bulk_pricing_rules")
    op.drop_table("business_profiles")
