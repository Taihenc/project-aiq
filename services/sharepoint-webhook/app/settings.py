"""Service configuration and validation."""

from __future__ import annotations

import os
from typing import Optional

from dotenv import load_dotenv


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        load_dotenv()

        # Microsoft Azure/Graph API Configuration
        self.tenant_id: str = os.getenv("TENANT_ID", "")
        self.client_id: str = os.getenv("CLIENT_ID", "")
        self.client_secret: str = os.getenv("CLIENT_SECRET", "")

        # SharePoint Configuration
        self.tenant_name: str = os.getenv("TENANT_NAME", "")
        self.site_name: str = os.getenv("SITE_NAME", "")
        self.list_name: str = os.getenv("LIST_NAME", "Documents")

        # Tunnel Configuration
        self.tunnel_type: str = os.getenv("TUNNEL_TYPE", "cloudflare").lower()
        self.ngrok_authtoken: Optional[str] = os.getenv("NGROK_AUTHTOKEN")
        self.ngrok_url: Optional[str] = os.getenv("NGROK_URL")
        self.cloudflare_tunnel_url: Optional[str] = os.getenv("CLOUDFLARE_TUNNEL_URL")

        # Server Configuration
        self.server_port: int = int(os.getenv("SERVER_PORT", "8010"))
        self.client_state: str = os.getenv("CLIENT_STATE", "mySecretClientStateForTesting")

        # File Sync Configuration
        self.enable_sync: bool = os.getenv("ENABLE_SYNC", "true").lower() in ("true", "1", "yes")
        self.sync_dir: str = os.getenv("SYNC_DIR", "./synced_files")

        # Logging Configuration
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()
        self.log_dir: str = os.getenv("LOG_DIR", "./logs")
        self.log_file: Optional[str] = os.getenv("LOG_FILE")

    def validate(self) -> list[str]:
        """Validate required settings."""
        errors: list[str] = []

        if not self.tenant_id:
            errors.append("TENANT_ID is required")
        if not self.client_id:
            errors.append("CLIENT_ID is required")
        if not self.client_secret:
            errors.append("CLIENT_SECRET is required")
        if not self.tenant_name:
            errors.append("TENANT_NAME is required")
        if not self.site_name:
            errors.append("SITE_NAME is required")

        if self.tunnel_type == "cloudflare" and not self.cloudflare_tunnel_url:
            errors.append("CLOUDFLARE_TUNNEL_URL is required when TUNNEL_TYPE=cloudflare")

        if self.tunnel_type not in {"ngrok", "cloudflare"}:
            errors.append("Invalid TUNNEL_TYPE. Must be 'ngrok' or 'cloudflare'")

        return errors


def get_settings() -> Settings:
    """Factory to allow dependency injection."""
    return Settings()

