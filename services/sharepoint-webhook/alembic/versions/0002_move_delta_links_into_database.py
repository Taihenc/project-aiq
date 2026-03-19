"""move delta links into database

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-09 00:10:00.000000
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from alembic import op
import sqlalchemy as sa


revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def _legacy_delta_links_path() -> Path:
    return Path(__file__).resolve().parents[2] / "logs" / "delta_links.json"


def upgrade() -> None:
    op.create_table(
        "delta_state",
        sa.Column("drive_id", sa.String(), nullable=False),
        sa.Column("delta_link", sa.String(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("drive_id"),
    )

    legacy_path = _legacy_delta_links_path()
    if not legacy_path.exists():
        return

    try:
        payload = json.loads(legacy_path.read_text())
    except (OSError, json.JSONDecodeError):
        return

    if not isinstance(payload, dict) or not payload:
        return

    now = datetime.now(timezone.utc)
    delta_state = sa.table(
        "delta_state",
        sa.column("drive_id", sa.String()),
        sa.column("delta_link", sa.String()),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        delta_state,
        [
            {
                "drive_id": drive_id,
                "delta_link": delta_link,
                "updated_at": now,
            }
            for drive_id, delta_link in payload.items()
            if isinstance(drive_id, str) and isinstance(delta_link, str)
        ],
    )


def downgrade() -> None:
    op.drop_table("delta_state")
