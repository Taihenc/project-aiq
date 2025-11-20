"""Local file synchronization for SharePoint changes."""

from __future__ import annotations

import shutil
import os
from pathlib import Path
from typing import Optional

import requests

from app.infrastructure.logging import get_logger
from app.infrastructure.graph.ms_graph_client import GraphAPIClient

logger = get_logger(__name__)


class FileSyncService:
    """Delegates file download to File Storage Service."""

    def __init__(self, graph_client: GraphAPIClient, sync_dir: str = "./synced_files"):
        self.graph_client = graph_client
        self.sync_dir = Path(sync_dir)
        self.sync_dir.mkdir(parents=True, exist_ok=True)
        self._file_id_map: dict[str, Path] = {}
        logger.info("Local sync directory: %s", self.sync_dir.absolute())

        self.file_storage_url = os.getenv("FILE_STORAGE_URL", "http://127.0.0.1:8007")
        logger.info("File Storage Service URL: %s", self.file_storage_url)

    def sync_changes(self, changes: list[dict], drive_id: str) -> None:
        if not changes:
            return

        logger.info("Processing %s changes...", len(changes))
        for item in changes:
            name = item.get("name", "Unknown")

            if "deleted" in item:
                item_id = item.get("id", "")
                logger.info("Processing deleted item: %s (ID: %s)", name, item_id)
                self._delegate_delete(item_id, name)
                continue

            if "file" in item:
                size = item.get("size", 0)
                if size > 0:
                    item_id = item.get("id", "")
                    # Use delegation by default
                    self._delegate_download(drive_id, item_id, name, item)
            elif "folder" in item:
                logger.info("Skipping folder: %s", name)

    def _delegate_download(self, drive_id: str, item_id: str, file_name: str, item_metadata: dict) -> bool:
        token = self.graph_client.get_access_token()
        if not token:
            logger.error("Failed to get access token for delegating %s", file_name)
            return False

        source_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"

        payload = {
            "source_url": source_url,
            "source_headers": {"Authorization": f"Bearer {token}"},
            "file_name": file_name,
            "metadata": item_metadata
        }

        try:
            response = requests.post(f"{self.file_storage_url}/files/upload-from-url", json=payload, timeout=10)
            if response.status_code == 202:
                logger.info("Delegated download for %s: ACCEPTED", file_name)
                return True
            logger.warning("Failed to delegate %s: HTTP %s", file_name, response.status_code)
            logger.warning("Response: %s", response.text)
        except Exception as exc:
            logger.error("Error delegating %s: %s", file_name, exc)
        return False

    def _delegate_delete(self, item_id: str, file_name: str) -> bool:
        try:
            # Delete by Source ID (SharePoint Item ID)
            response = requests.delete(f"{self.file_storage_url}/files/source/{item_id}", timeout=10)
            if response.status_code == 200:
                logger.info("Delegated deletion for %s: SUCCESS", file_name)
                return True
            elif response.status_code == 404:
                logger.info("Delegated deletion for %s: NOT FOUND (Already deleted?)", file_name)
                return True

            logger.warning("Failed to delegate deletion for %s: HTTP %s", file_name, response.status_code)
        except Exception as exc:
            logger.error("Error delegating deletion for %s: %s", file_name, exc)
        return False

    # --- Legacy Local Download Methods (Preserved but unused) ---

    def list_local_files(self) -> list[str]:
        return [str(path.relative_to(self.sync_dir)) for path in self.sync_dir.rglob("*") if path.is_file()]

    def _download_file(self, drive_id: str, item_id: str, file_name: str, relative_path: str) -> bool:
        token = self.graph_client.get_access_token()
        if not token:
            logger.error("Failed to get access token for downloading %s", file_name)
            return False

        # Check if this file ID was previously synced with a different name/path
        new_file_path = self.sync_dir / relative_path / file_name
        if item_id and item_id in self._file_id_map:
            old_file_path = self._file_id_map[item_id]
            if old_file_path != new_file_path and old_file_path.exists():
                logger.info("File renamed/moved: %s -> %s", old_file_path.relative_to(self.sync_dir), new_file_path.relative_to(self.sync_dir))
                old_file_path.unlink()
                self._cleanup_empty_dirs(old_file_path.parent)

        headers = {"Authorization": f"Bearer {token}"}
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"

        try:
            response = requests.get(url, headers=headers, stream=True, timeout=60)
            if response.status_code == 200:
                new_file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(new_file_path, "wb") as fh:
                    for chunk in response.iter_content(chunk_size=8192):
                        fh.write(chunk)
                # Update the mapping to track this file ID
                if item_id:
                    self._file_id_map[item_id] = new_file_path
                logger.info("Downloaded: %s/%s", relative_path or ".", file_name)
                return True
            logger.warning("Failed to download %s: HTTP %s", file_name, response.status_code)
        except Exception as exc:
            logger.error("Error downloading %s: %s", file_name, exc)
        return False

    def _delete_local_file(self, file_name: str, relative_path: str, item_id: Optional[str] = None) -> bool:
        file_path = self.sync_dir / relative_path / file_name
        if file_path.exists():
            file_path.unlink()
            logger.info("Deleted: %s/%s", relative_path or ".", file_name)
            self._cleanup_empty_dirs(file_path.parent)
            if item_id and item_id in self._file_id_map:
                del self._file_id_map[item_id]
            return True
        logger.debug("File not found locally: %s/%s", relative_path or ".", file_name)
        return False

    def _create_local_folder(self, folder_name: str, relative_path: str) -> bool:
        folder_path = self.sync_dir / relative_path / folder_name
        folder_path.mkdir(parents=True, exist_ok=True)
        logger.info("Created folder: %s/%s", relative_path or ".", folder_name)
        return True

    def _delete_local_folder(self, folder_name: str, relative_path: str) -> bool:
        folder_path = self.sync_dir / relative_path / folder_name
        if folder_path.exists():
            shutil.rmtree(folder_path)
            logger.info("Deleted folder: %s/%s", relative_path or ".", folder_name)
            self._cleanup_empty_dirs(folder_path.parent)
            return True
        logger.debug("Folder not found locally: %s/%s", relative_path or ".", folder_name)
        return False

    def _cleanup_empty_dirs(self, directory: Path) -> None:
        while directory != self.sync_dir and directory.exists():
            if not any(directory.iterdir()):
                directory.rmdir()
                directory = directory.parent
            else:
                break

    def _extract_relative_path(self, item: dict) -> str:
        parent_ref = item.get("parentReference", {})
        path = parent_ref.get("path", "")
        if "/root:" in path:
            relative_path = path.split("/root:")[-1]
            return relative_path.strip("/")
        if path.endswith("/root"):
            return ""
        return ""

    def _looks_like_file(self, name: str) -> bool:
        return "." in name and not name.startswith(".")


