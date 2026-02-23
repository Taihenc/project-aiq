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
            logger.warning("Attempting to upload file without initialized drive ID")
            return {"error": "Drive ID not initialized"}, 400

        content = await file.read()

        # Starlette decodes the multipart Content-Disposition filename as latin-1
        # (HTTP header default), but browsers send it as UTF-8.  Re-encode from
        # latin-1 back to raw bytes then decode as UTF-8 to recover the real name.
        try:
            file_name = (file.filename or "").encode("latin-1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            file_name = file.filename or "upload"

        result = app.state.graph_client.upload_file(
            app.state.drive_id,
            file_name,
            content,
            path
        )
        if result:
            logger.info("File uploaded successfully: %s", file_name)
            return {"status": "success", "item": result}

        logger.error("File upload failed: %s", file_name)
        return {"error": "Upload failed"}, 500

    @app.post("/ingest/{item_id}")
    async def trigger_ingest(item_id: str):
        """Manually trigger ingestion for a single SharePoint file by its item ID."""
        if not app.state.drive_id:
            return {"error": "Drive ID not initialized"}, 400

        # Fetch file metadata from Graph API
        item = app.state.graph_client.get_drive_item(app.state.drive_id, item_id)
        if not item:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found in SharePoint")

        if "file" not in item:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Item is a folder, not a file")

        file_name = item.get("name", f"file_{item_id}")
        logger.info("Manual ingest triggered for: %s (ID: %s)", file_name, item_id)

        # Reuse the same delegation path as the webhook sync
        from app.infrastructure.sharepoint.file_sync_service import FileSyncService
        sync_service = FileSyncService(graph_client=app.state.graph_client)
        success = sync_service._delegate_download(
            drive_id=app.state.drive_id,
            item_id=item_id,
            file_name=file_name,
            item_metadata=item,
        )

        if not success:
            from fastapi import HTTPException
            raise HTTPException(status_code=502, detail="Failed to delegate ingestion to File Storage Service")

        return {"status": "ACCEPTED", "item_id": item_id, "file_name": file_name}

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

