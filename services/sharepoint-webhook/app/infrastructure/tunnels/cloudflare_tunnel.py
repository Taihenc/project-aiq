"""Cloudflare tunnel implementation (manual)."""

from __future__ import annotations

from typing import Optional

from app.infrastructure.logging import get_logger
from .base import BaseTunnel

logger = get_logger(__name__)


class CloudflareTunnel(BaseTunnel):
    """Cloudflare tunnel service (user managed)."""

    def __init__(self, tunnel_url: str):
        self.tunnel_url = tunnel_url
        self._is_running = False

    def start(self, port: int) -> str:
        if not self.tunnel_url:
            raise ValueError("Cloudflare tunnel URL is not configured")

        self._is_running = True
        logger.info("Using Cloudflare tunnel: %s", self.tunnel_url)
        return self.tunnel_url

    def stop(self) -> None:
        self._is_running = False
        logger.info("Remember to stop cloudflared manually if it is still running.")

    def get_url(self) -> Optional[str]:
        return self.tunnel_url if self._is_running else None

