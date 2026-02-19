"""Microsoft Graph API client abstractions."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import msal
import requests

from app.infrastructure.logging import get_logger

logger = get_logger(__name__)


class GraphAPIClient:
    """Service for interacting with Microsoft Graph API."""

    def __init__(self, tenant_id: str, client_id: str, client_secret: str) -> None:
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self._access_token: Optional[str] = None
        self.authority = f"https://login.microsoftonline.com/{tenant_id}"
        self.scope = ["https://graph.microsoft.com/.default"]

    def get_site_id(self, tenant_name: str, site_name: str) -> Optional[str]:
        token = self._ensure_token()
        if not token:
            return None

        headers = {"Authorization": f"Bearer {token}"}
        hostname = f"{tenant_name}.sharepoint.com"
        relative_path = f"sites/{site_name}"
        site_get_url = f"https://graph.microsoft.com/v1.0/sites/{hostname}:/{relative_path}"

        try:
            response = requests.get(site_get_url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()["id"]
            logger.error("Failed to get site ID: HTTP %s", response.status_code)
        except Exception as exc:
            logger.error("Failed to get site ID: %s", exc)
        return None

    def get_drive_id(self, site_id: str, list_name: str) -> Optional[str]:
        token = self._ensure_token()
        if not token:
            return None

        headers = {"Authorization": f"Bearer {token}"}
        drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"

        try:
            response = requests.get(drives_url, headers=headers, timeout=30)
            if response.status_code == 200:
                for drive in response.json().get("value", []):
                    if drive.get("name") == list_name:
                        return drive["id"]
                logger.warning("Drive '%s' not found in site", list_name)
            else:
                logger.error("Failed to get drive ID: HTTP %s", response.status_code)
        except Exception as exc:
            logger.error("Failed to get drive ID: %s", exc)
        return None

    def create_subscription(
        self,
        drive_id: str,
        notification_url: str,
        client_state: str,
        expiration_hours: int = 1,
    ) -> Optional[Dict[str, Any]]:
        token = self._ensure_token()
        if not token:
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        expiration_time = (datetime.utcnow() + timedelta(hours=expiration_hours)).isoformat() + "Z"
        payload = {
            "changeType": "updated",
            "notificationUrl": notification_url,
            "resource": f"drives/{drive_id}/root",
            "expirationDateTime": expiration_time,
            "clientState": client_state,
        }

        try:
            response = requests.post(
                "https://graph.microsoft.com/v1.0/subscriptions",
                headers=headers,
                json=payload,
                timeout=30,
            )
            if response.status_code == 201:
                subscription = response.json()
                logger.info("Subscription created successfully: %s", subscription.get("id"))
                return subscription
            logger.error("Subscription creation failed: HTTP %s", response.status_code)
            logger.error("Response: %s", response.text)
        except Exception as exc:
            logger.error("Failed to create subscription: %s", exc)
        return None

    def get_drive_items(self, drive_id: str, path: Optional[str] = None) -> list[dict[str, Any]]:
        token = self._ensure_token()
        if not token:
            return []

        headers = {"Authorization": f"Bearer {token}"}
        if path and path.strip("/"):
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{path.strip('/')}:/children"
        else:
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"

        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json().get("value", [])
            logger.error("Failed to get drive items: HTTP %s", response.status_code)
            logger.error("Response: %s", response.text)
        except Exception as exc:
            logger.error("Failed to get drive items: %s", exc)
        return []

    def upload_file(self, drive_id: str, file_name: str, content: bytes, path: Optional[str] = None) -> Optional[dict[str, Any]]:
        token = self._ensure_token()
        if not token:
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream"
        }

        if path and path.strip("/"):
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{path.strip('/')}/{file_name}:/content"
        else:
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{file_name}:/content"

        try:
            response = requests.put(url, headers=headers, data=content, timeout=60)
            if response.status_code in (200, 201):
                return response.json()
            logger.error("Failed to upload file: HTTP %s", response.status_code)
            logger.error("Response: %s", response.text)
        except Exception as exc:
            logger.error("Failed to upload file: %s", exc)
        return None

    def get_access_token(self) -> Optional[str]:
        """Expose access token for other services (e.g., delta tracker)."""
        return self._ensure_token()

    def _ensure_token(self) -> Optional[str]:
        if self._access_token:
            return self._access_token

        client_app = msal.ConfidentialClientApplication(
            self.client_id,
            authority=self.authority,
            client_credential=self.client_secret,
        )
        token_result = client_app.acquire_token_for_client(scopes=self.scope)
        self._access_token = token_result.get("access_token")
        if not self._access_token:
            logger.error("Failed to obtain access token: %s", token_result)
        return self._access_token

