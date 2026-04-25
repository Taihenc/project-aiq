"""SharePoint delta tracking service."""

from __future__ import annotations

from threading import Lock
from typing import Any, Dict, Optional

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from app.db.store import clear_delta_state, get_delta_state, set_delta_state
from app.infrastructure.graph.ms_graph_client import GraphAPIClient
from loguru import logger

# logger is now imported from loguru


class DeltaTracker:
    """Tracks SharePoint drive changes using Microsoft Graph delta queries."""

    def __init__(self, graph_client: GraphAPIClient):
        self.graph_client = graph_client
        self._lock = Lock()

    def get_delta_link(self, drive_id: str) -> Optional[str]:
        with self._lock:
            state = get_delta_state(drive_id)
            return state.delta_link if state else None

    def _set_delta_link(self, drive_id: str, link: str) -> None:
        with self._lock:
            set_delta_state(drive_id, link)

    def _clear_delta_link(self, drive_id: str) -> None:
        with self._lock:
            clear_delta_state(drive_id)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_page(self, url: str, headers: dict[str, str]) -> requests.Response:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response

    def get_drive_changes(self, drive_id: str) -> Optional[Dict[str, Any]]:
        token = self.graph_client.get_access_token()
        if not token:
            return None

        headers = {"Authorization": f"Bearer {token}"}
        delta_url = self.get_delta_link(drive_id) or f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/delta"

        try:
            all_changes: list[dict[str, Any]] = []
            next_url = delta_url
            last_page: dict[str, Any] = {}

            while next_url:
                response = self._fetch_page(next_url, headers)
                last_page = response.json()
                all_changes.extend(last_page.get("value", []))
                next_url = last_page.get("@odata.nextLink")

            delta_link = last_page.get("@odata.deltaLink")
            if delta_link:
                self._set_delta_link(drive_id, delta_link)

            last_page["value"] = all_changes
            return last_page
        except Exception as exc:
            logger.error("Failed to fetch delta data: %s", exc)
        return None

    def reset_delta_link(self, drive_id: str) -> None:
        self._clear_delta_link(drive_id)

    def has_baseline(self, drive_id: str) -> bool:
        return self.get_delta_link(drive_id) is not None

