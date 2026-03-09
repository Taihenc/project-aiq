"""Notification orchestration logic."""

from __future__ import annotations

import threading
from typing import Iterable, Optional

from app.db.store import (
    create_file_sync_logs,
    create_notification,
    create_sync_operation,
    finish_sync_operation,
    update_notification,
)
from app.domain.models import ChangeNotification
from app.infrastructure.logging import get_logger
from app.infrastructure.sharepoint.delta_tracker import DeltaTracker
from app.infrastructure.sharepoint.file_sync_service import FileSyncResult, FileSyncService

logger = get_logger(__name__)

class NotificationService:
    """Coordinates handling of webhook notifications and optional file sync."""

    def __init__(
        self,
        delta_tracker: DeltaTracker,
        *,
        drive_id: Optional[str] = None,
        file_sync: Optional[FileSyncService] = None,
    ):
        self.delta_tracker = delta_tracker
        self.drive_id = drive_id
        self.file_sync = file_sync
        self._processing_lock = threading.Lock()

    def set_drive_id(self, drive_id: str) -> None:
        self.drive_id = drive_id

    def attach_file_sync(self, file_sync: FileSyncService) -> None:
        self.file_sync = file_sync

    def handle_notifications(self, payload: dict) -> None:
        """Entry point invoked by interfaces."""
        values = payload.get("value")
        if not values:
            return

        for raw_notification in values:
            notification = ChangeNotification.from_payload(raw_notification)
            self._log_notification(notification)
            notification_id = create_notification(raw_notification)
            threading.Thread(
                target=self._fetch_and_process_changes,
                args=(notification_id,),
                daemon=True,
            ).start()

    def _log_notification(self, notification: ChangeNotification) -> None:
        logger.info("-" * 60)
        logger.info("Change Type: %s", notification.change_type.upper())
        logger.info("Resource: %s", notification.resource)

    def _fetch_and_process_changes(self, notification_id: int) -> None:
        if not self.drive_id:
            logger.debug("Drive ID has not been set yet. Skipping delta fetch.")
            update_notification(notification_id, status="FAILED", error_message="Drive ID has not been set")
            return

        with self._processing_lock:
            update_notification(notification_id, status="PROCESSING")
            delta_link_used = self.delta_tracker.get_delta_link(self.drive_id)
            sync_operation_id = create_sync_operation(notification_id, delta_link_used=delta_link_used)
            had_baseline = self.delta_tracker.has_baseline(self.drive_id)

            try:
                logger.info("Fetching change details via delta query...")
                delta_data = self.delta_tracker.get_drive_changes(self.drive_id)
                if not delta_data:
                    raise RuntimeError("Failed to fetch delta data")

                changes = delta_data.get("value", [])
                if not had_baseline:
                    logger.info("Baseline established with %s items. Skipping initial sync.", len(changes))
                    finish_sync_operation(
                        sync_operation_id,
                        status="SUCCESS",
                        items_processed_count=len(changes),
                    )
                    update_notification(notification_id, status="PROCESSED")
                    return

                if not changes:
                    logger.info("No new changes detected.")
                    finish_sync_operation(sync_operation_id, status="SUCCESS", items_processed_count=0)
                    update_notification(notification_id, status="PROCESSED")
                    return

                logger.info("Changes detected (%s items):", len(changes))
                self._display_changes(changes)

                results: list[FileSyncResult] = []
                if self.file_sync:
                    results = self.file_sync.sync_changes(changes, self.drive_id)

                if results:
                    create_file_sync_logs(
                        sync_operation_id,
                        [
                            {
                                "sharepoint_item_id": result.sharepoint_item_id,
                                "file_name": result.file_name,
                                "action": result.action,
                                "status": result.status,
                                "detail": result.detail,
                            }
                            for result in results
                        ],
                    )

                sync_status = self._determine_sync_status(results)
                finish_sync_operation(
                    sync_operation_id,
                    status=sync_status,
                    items_processed_count=len(changes),
                )
                update_notification(
                    notification_id,
                    status="PROCESSED" if sync_status != "FAILURE" else "FAILED",
                    error_message=None,
                )
            except Exception as exc:
                logger.exception("Failed to process notification %s", notification_id)
                finish_sync_operation(
                    sync_operation_id,
                    status="FAILURE",
                    items_processed_count=0,
                    error_message=str(exc),
                )
                update_notification(notification_id, status="FAILED", error_message=str(exc))

    def _determine_sync_status(self, results: list[FileSyncResult]) -> str:
        if not results:
            return "SUCCESS"

        failed = [result for result in results if result.status == "FAILED"]
        if not failed:
            return "SUCCESS"
        if len(failed) == len(results):
            return "FAILURE"
        return "PARTIAL_FAILURE"

    def _display_changes(self, changes: Iterable[dict]) -> None:
        for item in changes:
            name = item.get("name", "Unknown")
            if "deleted" in item:
                logger.info("  [DELETED] %s", name)
            elif "file" in item:
                self._display_file_change(item, name)
            elif "folder" in item:
                logger.info("  [FOLDER] %s", name)

    def _display_file_change(self, item: dict, name: str) -> None:
        size = item.get("size", 0)
        modified = item.get("lastModifiedDateTime", "N/A")
        created = item.get("createdDateTime", "N/A")

        if created == modified:
            logger.info("  [CREATED] %s (%s bytes)", name, size)
        else:
            logger.info("  [MODIFIED] %s (%s bytes)", name, size)
        logger.info("      [Modified] %s", modified)

