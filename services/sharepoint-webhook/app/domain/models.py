"""Domain entities for SharePoint webhook."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class SubscriptionContext:
    """Context required to register a webhook subscription."""

    tenant_name: str
    site_name: str
    list_name: str
    client_state: str


@dataclass
class ChangeNotification:
    """Value object representing a webhook notification payload."""

    change_type: str
    resource: str
    raw: Dict[str, Any]

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "ChangeNotification":
        return cls(
            change_type=payload.get("changeType", "unknown"),
            resource=payload.get("resource", ""),
            raw=payload,
        )

