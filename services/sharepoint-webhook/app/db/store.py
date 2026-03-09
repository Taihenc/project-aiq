from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Iterable, Optional

from app.db.models import DeltaState, FileSyncLog, Notification, SyncOperation, open_session


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_notification(raw_payload: dict) -> int:
    with open_session() as session:
        notification = Notification(raw_payload=json.dumps(raw_payload), status="RECEIVED")
        session.add(notification)
        session.commit()
        session.refresh(notification)
        if notification.id is None:
            raise RuntimeError("Notification ID was not generated")
        return notification.id


def update_notification(notification_id: int, *, status: str, error_message: Optional[str] = None) -> None:
    with open_session() as session:
        notification = session.get(Notification, notification_id)
        if notification is None:
            return
        notification.status = status
        notification.error_message = error_message
        session.add(notification)
        session.commit()


def create_sync_operation(notification_id: int, *, delta_link_used: Optional[str]) -> int:
    with open_session() as session:
        operation = SyncOperation(
            notification_id=notification_id,
            delta_link_used=delta_link_used,
            status="PROCESSING",
        )
        session.add(operation)
        session.commit()
        session.refresh(operation)
        if operation.id is None:
            raise RuntimeError("Sync operation ID was not generated")
        return operation.id


def finish_sync_operation(
    sync_operation_id: int,
    *,
    status: str,
    items_processed_count: int,
    error_message: Optional[str] = None,
) -> None:
    with open_session() as session:
        operation = session.get(SyncOperation, sync_operation_id)
        if operation is None:
            return
        operation.status = status
        operation.items_processed_count = items_processed_count
        operation.finished_at = utc_now()
        operation.error_message = error_message
        session.add(operation)
        session.commit()


def create_file_sync_logs(sync_operation_id: int, items: Iterable[dict]) -> None:
    with open_session() as session:
        for item in items:
            session.add(FileSyncLog(sync_operation_id=sync_operation_id, **item))
        session.commit()


def get_delta_state(drive_id: str) -> Optional[DeltaState]:
    with open_session() as session:
        return session.get(DeltaState, drive_id)


def set_delta_state(drive_id: str, delta_link: str) -> None:
    with open_session() as session:
        state = session.get(DeltaState, drive_id)
        if state is None:
            state = DeltaState(drive_id=drive_id, delta_link=delta_link, updated_at=utc_now())
        else:
            state.delta_link = delta_link
            state.updated_at = utc_now()
        session.add(state)
        session.commit()


def clear_delta_state(drive_id: str) -> None:
    with open_session() as session:
        state = session.get(DeltaState, drive_id)
        if state is None:
            return
        session.delete(state)
        session.commit()
