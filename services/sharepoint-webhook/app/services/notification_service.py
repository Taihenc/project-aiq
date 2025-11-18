"""Notification orchestration logic."""

from __future__ import annotations

from typing import Iterable, Optional

from app.domain.models import ChangeNotification
from app.infrastructure.logging import get_logger
from app.infrastructure.sharepoint.delta_tracker import DeltaTracker
from app.infrastructure.sharepoint.file_sync_service import FileSyncService

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

    def set_drive_id(self, drive_id: str) -> None:
        self.drive_id = drive_id

    def attach_file_sync(self, file_sync: FileSyncService) -> None:
        self.file_sync = file_sync

    def handle_notifications(self, payload: dict) -> None:
        """Entry point invoked by interfaces."""
        values = payload.get("value")
        if not values:
            return

        for notification in map(ChangeNotification.from_payload, values):
            self._log_notification(notification)
            self._fetch_and_process_changes()

    def _log_notification(self, notification: ChangeNotification) -> None:
        logger.info("-" * 60)
        logger.info("Change Type: %s", notification.change_type.upper())
        logger.info("Resource: %s", notification.resource)

    def _fetch_and_process_changes(self) -> None:
        if not self.drive_id:
            logger.debug("Drive ID has not been set yet. Skipping delta fetch.")
            return

        logger.info("Fetching change details via delta query...")
        delta_data = self.delta_tracker.get_drive_changes(self.drive_id)
        if not delta_data:
            return

        changes = delta_data.get("value", [])
        if not self.delta_tracker.has_baseline and changes:
            logger.info("Baseline established with %s items.", len(changes))
            return

        if not changes:
            logger.info("No new changes detected.")
            return

        logger.info("Changes detected (%s items):", len(changes))
        self._display_changes(changes)
        if self.file_sync:
            self.file_sync.sync_changes(changes, self.drive_id)

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

