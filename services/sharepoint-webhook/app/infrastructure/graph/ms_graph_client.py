"""Microsoft Graph API client abstractions."""

from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from urllib.parse import quote

import msal
import requests

from loguru import logger

# logger is now imported from loguru

# Refresh the token this many seconds before it actually expires to avoid
# race conditions between the expiry check and the HTTP round-trip.
_TOKEN_REFRESH_BUFFER_SECONDS = 300  # 5 minutes


class GraphAPIClient:
    """Service for interacting with Microsoft Graph API."""

    def __init__(self, tenant_id: str, client_id: str, client_secret: str) -> None:
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self._token_lock = threading.Lock()
        self.authority = f"https://login.microsoftonline.com/{tenant_id}"
        self.scope = ["https://graph.microsoft.com/.default"]

    def get_site_id(self, tenant_name: str, site_name: str) -> Optional[str]:
        hostname = f"{tenant_name}.sharepoint.com"
        relative_path = f"sites/{site_name}"
        url = f"https://graph.microsoft.com/v1.0/sites/{hostname}:/{relative_path}"
        response = self._get(url)
        if response is not None and response.status_code == 200:
            return response.json()["id"]
        return None

    def get_drive_id(self, site_id: str, list_name: str) -> Optional[str]:
        url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
        response = self._get(url)
        if response is not None and response.status_code == 200:
            for drive in response.json().get("value", []):
                if drive.get("name") == list_name:
                    return drive["id"]
            logger.warning("Drive '%s' not found in site", list_name)
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
        expiration_time = (
            datetime.now(tz=timezone.utc) + timedelta(hours=expiration_hours)
        ).isoformat()
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
        if path and path.strip("/"):
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{path.strip('/')}:/children"
        else:
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
        response = self._get(url)
        if response is not None and response.status_code == 200:
            return response.json().get("value", [])
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
            # Encode each path segment and the filename independently so
            # non-ASCII characters (e.g. Thai, Chinese) don't break the URL.
            encoded_path = "/".join(quote(seg, safe="") for seg in path.strip("/").split("/"))
            encoded_name = quote(file_name, safe="")
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}/{encoded_name}:/content"
        else:
            encoded_name = quote(file_name, safe="")
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_name}:/content"

        try:
            response = requests.put(url, headers=headers, data=content, timeout=60)
            if response.status_code in (200, 201):
                return response.json()
            logger.error("Failed to upload file: HTTP %s", response.status_code)
            logger.error("Response: %s", response.text)
        except Exception as exc:
            logger.error("Failed to upload file: %s", exc)
        return None

    def get_drive_item(self, drive_id: str, item_id: str) -> Optional[dict[str, Any]]:
        """Fetch metadata for a single drive item by its ID."""
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}"
        response = self._get(url)
        if response is not None and response.status_code == 200:
            return response.json()
        return None

    def get_access_token(self) -> Optional[str]:
        """Expose access token for other services (e.g., delta tracker)."""
        return self._ensure_token()

    def _get(self, url: str) -> Optional[requests.Response]:
        """GET with automatic token refresh and one retry on 401."""
        for attempt in range(2):
            token = self._ensure_token()
            if not token:
                return None
            try:
                response = requests.get(
                    url, headers={"Authorization": f"Bearer {token}"}, timeout=30
                )
                if response.status_code == 401 and attempt == 0:
                    logger.warning(
                        "Received 401 for %s — token expired, refreshing and retrying", url
                    )
                    self._invalidate_token()
                    continue
                if response.status_code not in (200, 304):
                    logger.error("Failed request to %s: HTTP %s", url, response.status_code)
                    logger.error("Response: %s", response.text)
                return response
            except Exception as exc:
                logger.error("Request to %s failed: %s", url, exc)
                return None
        return None

    def _invalidate_token(self) -> None:
        with self._token_lock:
            self._access_token = None
            self._token_expires_at = None

    def _ensure_token(self) -> Optional[str]:
        with self._token_lock:
            now = datetime.now(tz=timezone.utc)
            if (
                self._access_token
                and self._token_expires_at
                and now < self._token_expires_at - timedelta(seconds=_TOKEN_REFRESH_BUFFER_SECONDS)
            ):
                return self._access_token

            # Token missing, expired, or within the refresh buffer — acquire a new one.
            logger.debug("Acquiring new MS Graph access token")
            client_app = msal.ConfidentialClientApplication(
                self.client_id,
                authority=self.authority,
                client_credential=self.client_secret,
            )
            token_result = client_app.acquire_token_for_client(scopes=self.scope)
            token = token_result.get("access_token")
            if not token:
                logger.error("Failed to obtain access token: %s", token_result)
                self._access_token = None
                self._token_expires_at = None
                return None

            expires_in = int(token_result.get("expires_in", 3600))
            self._access_token = token
            self._token_expires_at = now + timedelta(seconds=expires_in)
            logger.info(
                "MS Graph access token acquired, expires in %ss (at %s)",
                expires_in,
                self._token_expires_at.isoformat(),
            )
            return self._access_token

