"""Add KYC tables, columns, and order snapshot address

Revision ID: 0006_kyc_and_order_updates
Revises: 0005_secure_handoff_otp
Create Date: 2026-10-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0006_kyc_and_order_updates"
down_revision: Union[str, None] = "0005_secure_handoff_otp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # orders table
    op.add_column("orders", sa.Column("customer_delivery_address", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("landmark", sa.String(255), nullable=True))
    op.add_column("orders", sa.Column("pickup_otp", sa.String(10), nullable=True))
    op.add_column("orders", sa.Column("pickup_otp_created_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("pickup_otp_verified_at", sa.DateTime(timezone=True), nullable=True))

    # seller_profiles table
    op.add_column("seller_profiles", sa.Column("kyc_status", sa.String(50), server_default="DRAFT", nullable=False))
    op.add_column("seller_profiles", sa.Column("kyc_submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("seller_profiles", sa.Column("kyc_verified_at", sa.DateTime(timezone=True), nullable=True))

    # delivery_partners table
    op.add_column("delivery_partners", sa.Column("kyc_status", sa.String(50), server_default="DRAFT", nullable=False))
    op.add_column("delivery_partners", sa.Column("kyc_submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("delivery_partners", sa.Column("kyc_verified_at", sa.DateTime(timezone=True), nullable=True))

    # seller_kyc table
    op.create_table(
        "seller_kyc",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("seller_profile_id", sa.BigInteger(), sa.ForeignKey("seller_profiles.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(50), server_default="DRAFT", nullable=False),
        sa.Column("business_type", sa.String(50), server_default="RETAIL_STORE", nullable=False),
        sa.Column("business_proof_type", sa.String(50), nullable=True),
        sa.Column("business_proof_number", sa.String(100), nullable=True),
        sa.Column("business_proof_file", sa.String(500), nullable=True),
        sa.Column("shop_front_photo", sa.String(500), nullable=True),
        sa.Column("shop_interior_photo", sa.String(500), nullable=True),
        sa.Column("shop_signage_photo", sa.String(500), nullable=True),
        sa.Column("id_proof_type", sa.String(50), nullable=True),
        sa.Column("id_proof_number_masked", sa.String(100), nullable=True),
        sa.Column("id_proof_file", sa.String(500), nullable=True),
        sa.Column("selfie_file", sa.String(500), nullable=True),
        sa.Column("liveness_status", sa.String(50), server_default="PENDING_VERIFICATION", nullable=False),
        sa.Column("bank_account_holder", sa.String(100), nullable=True),
        sa.Column("bank_account_number_masked", sa.String(50), nullable=True),
        sa.Column("bank_ifsc", sa.String(20), nullable=True),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("bank_upi_id", sa.String(100), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reupload_notes", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewer_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # delivery_partner_kyc table
    op.create_table(
        "delivery_partner_kyc",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("delivery_partner_id", sa.BigInteger(), sa.ForeignKey("delivery_partners.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(50), server_default="DRAFT", nullable=False),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column("dob", sa.String(20), nullable=True),
        sa.Column("emergency_contact_name", sa.String(100), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(20), nullable=True),
        sa.Column("profile_photo", sa.String(500), nullable=True),
        sa.Column("selfie_file", sa.String(500), nullable=True),
        sa.Column("liveness_status", sa.String(50), server_default="PENDING_VERIFICATION", nullable=False),
        sa.Column("id_proof_type", sa.String(50), nullable=True),
        sa.Column("id_proof_number_masked", sa.String(100), nullable=True),
        sa.Column("id_proof_file", sa.String(500), nullable=True),
        sa.Column("driving_license_number", sa.String(50), nullable=True),
        sa.Column("driving_license_expiry", sa.String(20), nullable=True),
        sa.Column("driving_license_file", sa.String(500), nullable=True),
        sa.Column("vehicle_type", sa.String(50), server_default="Motorcycle", nullable=True),
        sa.Column("vehicle_number", sa.String(30), nullable=True),
        sa.Column("rc_book_file", sa.String(500), nullable=True),
        sa.Column("insurance_file", sa.String(500), nullable=True),
        sa.Column("operating_city", sa.String(100), server_default="Solapur", nullable=False),
        sa.Column("operating_zone", sa.String(100), nullable=True),
        sa.Column("bank_account_holder", sa.String(100), nullable=True),
        sa.Column("bank_account_number_masked", sa.String(50), nullable=True),
        sa.Column("bank_ifsc", sa.String(20), nullable=True),
        sa.Column("bank_upi_id", sa.String(100), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reupload_notes", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewer_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # kyc_audits table
    op.create_table(
        "kyc_audits",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("kyc_type", sa.String(30), nullable=False),
        sa.Column("target_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewer_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("previous_status", sa.String(50), nullable=True),
        sa.Column("new_status", sa.String(50), nullable=False),
        sa.Column("decision", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("reupload_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("kyc_audits")
    op.drop_table("delivery_partner_kyc")
    op.drop_table("seller_kyc")
    op.drop_column("delivery_partners", "kyc_verified_at")
    op.drop_column("delivery_partners", "kyc_submitted_at")
    op.drop_column("delivery_partners", "kyc_status")
    op.drop_column("seller_profiles", "kyc_verified_at")
    op.drop_column("seller_profiles", "kyc_submitted_at")
    op.drop_column("seller_profiles", "kyc_status")
    op.drop_column("orders", "pickup_otp_verified_at")
    op.drop_column("orders", "pickup_otp_created_at")
    op.drop_column("orders", "pickup_otp")
    op.drop_column("orders", "landmark")
    op.drop_column("orders", "customer_delivery_address")
