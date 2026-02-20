import json
from typing import Callable, Optional
from fastapi import FastAPI, Request, Response, UploadFile, File, Query
from fastapi.responses import PlainTextResponse

from app.infrastructure.logging import get_logger
from app.infrastructure.graph.ms_graph_client import GraphAPIClient

logger = get_logger(__name__)

def create_app(public_url: str | None, handler: Callable[[dict], None], graph_client: GraphAPIClient) -> FastAPI:
    """Create FastAPI application and register webhook route."""
    app = FastAPI(title="SharePoint Webhook Service", version="1.0.0")
    app.state.public_url = public_url
    app.state.notification_handler = handler
    app.state.graph_client = graph_client
    app.state.drive_id = None # Will be set later

    @app.get("/")
    async def index() -> str:
        url = getattr(app.state, "public_url", "Unknown")
        return f"SharePoint webhook online. Public URL: {url}"

    @app.get("/files")
    async def list_files(path: Optional[str] = Query(None)):
        if not app.state.drive_id:
            return {"error": "Drive ID not initialized"}, 400

        items = app.state.graph_client.get_drive_items(app.state.drive_id, path)
        return {"items": items}

    @app.post("/upload")
    async def upload_file(path: Optional[str] = Query(None), file: UploadFile = File(...)):
        if not app.state.drive_id:
            return {"error": "Drive ID not initialized"}, 400

        content = await file.read()
        result = app.state.graph_client.upload_file(
            app.state.drive_id,
            file.filename,
            content,
            path
        )
        if result:
            return {"status": "success", "item": result}
        return {"error": "Upload failed"}, 500

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

