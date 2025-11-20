"""Use case for establishing SharePoint subscriptions."""

from __future__ import annotations

from typing import Optional

from app.domain.models import SubscriptionContext
from app.infrastructure.graph.ms_graph_client import GraphAPIClient
from app.infrastructure.logging import get_logger

logger = get_logger(__name__)


class SubscriptionService:
    """Coordinates the multi-step Microsoft Graph subscription flow."""

    def __init__(self, graph_client: GraphAPIClient):
        self.graph_client = graph_client

    def register_subscription(self, ctx: SubscriptionContext, webhook_url: str) -> Optional[str]:
        """Create a subscription and return the subscribed drive ID."""
        logger.info("Creating subscription for webhook: %s", webhook_url)

        site_id = self.graph_client.get_site_id(ctx.tenant_name, ctx.site_name)
        if not site_id:
            logger.error("Could not resolve site ID. Aborting subscription.")
            return None
        logger.info("Resolved site '%s' -> %s", ctx.site_name, site_id)

        drive_id = self.graph_client.get_drive_id(site_id, ctx.list_name)
        if not drive_id:
            logger.error("Could not resolve drive ID. Aborting subscription.")
            return None
        logger.info("Resolved drive '%s' -> %s", ctx.list_name, drive_id)

        subscription = self.graph_client.create_subscription(
            drive_id=drive_id,
            notification_url=webhook_url,
            client_state=ctx.client_state,
        )

        if not subscription:
            logger.error("Subscription request failed.")
            return None

        logger.info("Subscription created successfully.")
        return drive_id

