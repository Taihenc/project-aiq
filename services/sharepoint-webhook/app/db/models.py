from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import MetaData
from sqlmodel import Field, Session, SQLModel, create_engine

DATABASE_PATH = Path(__file__).resolve().parents[2] / "sharepoint_webhook.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    received_at: datetime = Field(default_factory=utc_now)
    raw_payload: str
    status: str = "RECEIVED"
    error_message: Optional[str] = None


class SyncOperation(SQLModel, table=True):
    __tablename__ = "sync_operations"

    id: Optional[int] = Field(default=None, primary_key=True)
    notification_id: int = Field(foreign_key="notifications.id", index=True)
    started_at: datetime = Field(default_factory=utc_now)
    finished_at: Optional[datetime] = None
    delta_link_used: Optional[str] = None
    items_processed_count: int = 0
    status: str = "PROCESSING"
    error_message: Optional[str] = None


class FileSyncLog(SQLModel, table=True):
    __tablename__ = "file_sync_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    sync_operation_id: int = Field(foreign_key="sync_operations.id", index=True)
    sharepoint_item_id: str = Field(index=True)
    file_name: str
    action: str
    status: str = "PENDING"
    detail: Optional[str] = None


class DeltaState(SQLModel, table=True):
    __tablename__ = "delta_state"

    drive_id: str = Field(primary_key=True)
    delta_link: str
    updated_at: datetime = Field(default_factory=utc_now)


def open_session() -> Session:
    return Session(engine)


def get_metadata() -> MetaData:
    return SQLModel.metadata
