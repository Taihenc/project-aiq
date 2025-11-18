"""Ngrok tunnel implementation."""

from __future__ import annotations

from typing import Optional

from pyngrok import ngrok as pyngrok

from app.infrastructure.logging import get_logger
from .base import BaseTunnel

logger = get_logger(__name__)


class NgrokTunnel(BaseTunnel):
    """Ngrok tunnel service for automatic tunnel creation."""

    def __init__(self, auth_token: Optional[str] = None, manual_url: Optional[str] = None):
        self.auth_token = auth_token
        self.manual_url = manual_url
        self._tunnel = None
        self._public_url: Optional[str] = None

        if auth_token:
            pyngrok.set_auth_token(auth_token)

    def start(self, port: int) -> str:
        if self.manual_url:
            self._public_url = self.manual_url
            logger.info("Using manually configured URL: %s", self.manual_url)
            return self.manual_url

        logger.info("Starting ngrok tunnel for port %s ...", port)
        self._tunnel = pyngrok.connect(port, bind_tls=True)
        self._public_url = self._tunnel.public_url
        logger.info("Ngrok tunnel ready: %s", self._public_url)
        return self._public_url

    def stop(self) -> None:
        if self._tunnel:
            logger.info("Closing ngrok tunnel...")
            try:
                pyngrok.disconnect(self._tunnel.public_url)
            finally:
                self._tunnel = None
                self._public_url = None

    def get_url(self) -> Optional[str]:
        return self._public_url

