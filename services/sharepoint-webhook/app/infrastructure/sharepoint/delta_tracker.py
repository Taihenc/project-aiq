"""SharePoint delta tracking service."""

from __future__ import annotations

from typing import Any, Dict, Optional

import requests

from app.infrastructure.logging import get_logger
from app.infrastructure.graph.ms_graph_client import GraphAPIClient

logger = get_logger(__name__)


class DeltaTracker:
    """Tracks SharePoint drive changes using Microsoft Graph delta queries."""

    def __init__(self, graph_client: GraphAPIClient):
        self.graph_client = graph_client
        self._delta_link: Optional[str] = None

    def get_drive_changes(self, drive_id: str) -> Optional[Dict[str, Any]]:
        token = self.graph_client.get_access_token()
        if not token:
            return None

        headers = {"Authorization": f"Bearer {token}"}
        delta_url = self._delta_link or f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/delta"

        try:
            response = requests.get(delta_url, headers=headers, timeout=30)
            if response.status_code == 200:
                data = response.json()
                delta_link = data.get("@odata.deltaLink")
                if delta_link:
                    self._delta_link = delta_link
                return data
            logger.error("Failed to fetch delta data: HTTP %s", response.status_code)
        except Exception as exc:
            logger.error("Failed to fetch delta data: %s", exc)
        return None

    def reset_delta_link(self) -> None:
        self._delta_link = None

    @property
    def has_baseline(self) -> bool:
        return self._delta_link is not None

