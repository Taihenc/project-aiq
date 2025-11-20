"""Base tunnel abstractions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class BaseTunnel(ABC):
    """Base class for tunnel services."""

    @abstractmethod
    def start(self, port: int) -> str:
        """Start the tunnel and return the public URL."""

    @abstractmethod
    def stop(self) -> None:
        """Stop the tunnel and clean up resources."""

    @abstractmethod
    def get_url(self) -> Optional[str]:
        """Return the currently exposed public URL, if any."""

