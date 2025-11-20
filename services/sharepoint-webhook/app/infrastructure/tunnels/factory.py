"""Factory for creating tunnel instances."""

from __future__ import annotations

from typing import Optional

from .base import BaseTunnel
from .cloudflare_tunnel import CloudflareTunnel
from .ngrok_tunnel import NgrokTunnel


class TunnelFactory:
    """Factory for creating tunnel adapters."""

    @staticmethod
    def create(
        tunnel_type: str,
        *,
        ngrok_auth_token: Optional[str] = None,
        ngrok_url: Optional[str] = None,
        cloudflare_url: Optional[str] = None,
    ) -> BaseTunnel:
        tunnel_type = tunnel_type.lower()
        if tunnel_type == "ngrok":
            return NgrokTunnel(auth_token=ngrok_auth_token, manual_url=ngrok_url)
        if tunnel_type == "cloudflare":
            if not cloudflare_url:
                raise ValueError("Cloudflare tunnel URL is required")
            return CloudflareTunnel(tunnel_url=cloudflare_url)
        raise ValueError(f"Invalid tunnel type: {tunnel_type}")

