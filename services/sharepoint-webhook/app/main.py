"""Application bootstrap for the SharePoint webhook service."""

from __future__ import annotations

import sys
import threading
import time

import uvicorn

from app.services.notification_service import NotificationService
from app.services.subscription_service import SubscriptionService
from app.domain.models import SubscriptionContext
from app.infrastructure.graph.ms_graph_client import GraphAPIClient
from app.infrastructure.logging import get_logger, setup_logging
from app.infrastructure.sharepoint.delta_tracker import DeltaTracker
from app.infrastructure.sharepoint.file_sync_service import FileSyncService
from app.infrastructure.tunnels.factory import TunnelFactory
from app.interfaces.http.server import create_app
from app.settings import get_settings

logger = get_logger(__name__)


def _log_error_and_exit(title: str, messages: list[str]) -> None:
    logger.error("=" * 60)
    logger.error(title)
    logger.error("=" * 60)
    for msg in messages:
        logger.error("  %s", msg)
    sys.exit(1)


def _log_tunnel_help(tunnel_type: str) -> None:
    if tunnel_type == "ngrok":
        logger.info("Install ngrok: brew install ngrok")
        logger.info("Optional auth token: set NGROK_AUTHTOKEN in your env.")
        logger.info("Manual tunnel: ngrok http 8000 -> set NGROK_URL.")
    else:
        logger.info("Install cloudflared: brew install cloudflared")
        logger.info("Start tunnel: cloudflared tunnel --url http://localhost:8000")
        logger.info("Provide CLOUDFLARE_TUNNEL_URL with the printed URL.")


def _start_fastapi(app, port: int) -> None:
    uvicorn.run(app, host="0.0.0.0", port=port, log_config=None)


def main() -> None:
    settings = get_settings()
    validation_errors = settings.validate()
    if validation_errors:
        _log_error_and_exit("Configuration validation failed", validation_errors)

    setup_logging(settings.log_level, settings.log_file, settings.log_dir)
    logger.info("Starting SharePoint webhook service...")

    graph_client = GraphAPIClient(
        tenant_id=settings.tenant_id,
        client_id=settings.client_id,
        client_secret=settings.client_secret,
    )
    delta_tracker = DeltaTracker(graph_client)

    file_sync = FileSyncService(graph_client, sync_dir=settings.sync_dir) if settings.enable_sync else None
    notification_service = NotificationService(delta_tracker, file_sync=file_sync)
    subscription_service = SubscriptionService(graph_client)

    try:
        tunnel = TunnelFactory.create(
            settings.tunnel_type,
            ngrok_auth_token=settings.ngrok_authtoken,
            ngrok_url=settings.ngrok_url,
            cloudflare_url=settings.cloudflare_tunnel_url,
        )
    except ValueError as exc:
        _log_error_and_exit("Tunnel configuration error", [str(exc)])
        return

    try:
        public_url = tunnel.start(settings.server_port)
    except Exception as exc:
        _log_error_and_exit(f"Failed to start {settings.tunnel_type} tunnel", [str(exc)])
        _log_tunnel_help(settings.tunnel_type)
        return

    fastapi_app = create_app(public_url, notification_service.handle_notifications, graph_client)
    threading.Thread(target=_start_fastapi, args=(fastapi_app, settings.server_port), daemon=True).start()
    logger.info("FastAPI server booted on port %s", settings.server_port)
    time.sleep(5)

    webhook_url = public_url.rstrip("/") + "/webhook"
    ctx = SubscriptionContext(
        tenant_name=settings.tenant_name,
        site_name=settings.site_name,
        list_name=settings.list_name,
        client_state=settings.client_state,
    )
    drive_id = subscription_service.register_subscription(ctx, webhook_url)
    if not drive_id:
        _log_error_and_exit("Subscription creation failed", ["Check Azure/SharePoint configuration."])
        return

    fastapi_app.state.drive_id = drive_id
    notification_service.set_drive_id(drive_id)

    if delta_tracker.has_baseline(drive_id):
        logger.info("Existing delta baseline found for drive %s.", drive_id)
    else:
        logger.info("Establishing initial delta baseline for drive %s...", drive_id)
        baseline_data = delta_tracker.get_drive_changes(drive_id)
        if not baseline_data or not delta_tracker.has_baseline(drive_id):
            _log_error_and_exit(
                "Delta baseline initialization failed",
                [
                    "The service could not establish an initial SharePoint delta link.",
                    "Run the service again after fixing Graph API connectivity or permissions.",
                ],
            )
            return

        logger.info(
            "Initial delta baseline established with %s items. Startup will not ingest this baseline snapshot.",
            len(baseline_data.get("value", [])),
        )

    logger.info("*" * 50)
    logger.info("System ready! Webhook endpoint: %s", webhook_url)
    logger.info("*" * 50)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down service...")
        tunnel.stop()
        logger.info("Shutdown complete.")


if __name__ == "__main__":
    main()

