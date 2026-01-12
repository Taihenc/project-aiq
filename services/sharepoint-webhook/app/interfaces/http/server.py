"""HTTP interface for webhook callbacks."""

from __future__ import annotations

import json
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse

from app.infrastructure.logging import get_logger

logger = get_logger(__name__)


def create_app(public_url: str | None, handler: Callable[[dict], None]) -> FastAPI:
    """Create FastAPI application and register webhook route."""
    app = FastAPI(title="SharePoint Webhook Service", version="1.0.0")
    app.state.public_url = public_url
    app.state.notification_handler = handler

    @app.get("/")
    async def index() -> str:
        url = getattr(app.state, "public_url", "Unknown")
        return f"SharePoint webhook online. Public URL: {url}"

    @app.api_route("/webhook", methods=["GET", "POST"])
    async def webhook(request: Request) -> Response:
        validation_token = request.query_params.get("validationToken")
        if validation_token:
            logger.info("Validation challenge received. Echoing token.")
            return PlainTextResponse(validation_token)

        try:
            notification_data = await request.json()
        except Exception:
            notification_data = {}

        logger.info("=" * 60)
        logger.info("New notification received!")
        logger.info("=" * 60)
        logger.debug(json.dumps(notification_data, indent=2))

        app.state.notification_handler(notification_data)
        logger.info("=" * 60)
        return Response(status_code=202)

    return app

