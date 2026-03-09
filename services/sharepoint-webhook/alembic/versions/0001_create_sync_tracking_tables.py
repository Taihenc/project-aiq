"""create sync tracking tables

Revision ID: 0001
Revises:
Create Date: 2026-03-09 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_payload", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sync_operations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("notification_id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delta_link_used", sa.String(), nullable=True),
        sa.Column("items_processed_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["notification_id"], ["notifications.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sync_operations_notification_id"), "sync_operations", ["notification_id"], unique=False)

    op.create_table(
        "file_sync_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sync_operation_id", sa.Integer(), nullable=False),
        sa.Column("sharepoint_item_id", sa.String(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("detail", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["sync_operation_id"], ["sync_operations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_file_sync_log_sharepoint_item_id"), "file_sync_log", ["sharepoint_item_id"], unique=False)
    op.create_index(op.f("ix_file_sync_log_sync_operation_id"), "file_sync_log", ["sync_operation_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_file_sync_log_sync_operation_id"), table_name="file_sync_log")
    op.drop_index(op.f("ix_file_sync_log_sharepoint_item_id"), table_name="file_sync_log")
    op.drop_table("file_sync_log")
    op.drop_index(op.f("ix_sync_operations_notification_id"), table_name="sync_operations")
    op.drop_table("sync_operations")
    op.drop_table("notifications")
