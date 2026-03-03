from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import asyncio
import httpx
import uuid
import io
import os
import json
import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from core.storage import StorageService
from core.messaging import AsyncMessagePublisher
from db.models import File
from db.session import engine, create_db_and_tables

NESTJS_WEBHOOK_URL = os.environ.get(
    "NESTJS_WEBHOOK_URL",
    "http://127.0.0.1:3000/api/v1/sharepoint/webhook/status",
)


async def _send_webhook(file_id: str, source_id: str, status: str, file_name: str) -> None:
    delays = [1.0, 3.0, 9.0]
    for attempt, delay in enumerate(delays, 1):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    NESTJS_WEBHOOK_URL,
                    json={"file_id": file_id, "source_id": source_id,
                          "status": status, "file_name": file_name},
                    timeout=5.0,
                )
            return
        except Exception as exc:  # noqa: BLE001
            if attempt < len(delays):
                await asyncio.sleep(delay)
            else:
                logging.error(
                    "[webhook] Exhausted retries for %s \u2192 %s: %s", file_id, status, exc
                )


def _notify_webhook(file_id: str, source_id: str, status: str, file_name: str = "") -> None:
    """Schedule a fire-and-forget webhook notification on the running event loop."""
    asyncio.create_task(_send_webhook(file_id, source_id, status, file_name))


app = FastAPI()

storage_service = StorageService()
message_publisher = AsyncMessagePublisher()

def _new_session() -> Session:
    """Return a session with expire_on_commit=False so detached objects stay readable."""
    return Session(engine, expire_on_commit=False)

# PATCH /files/{id}/status rejects any move not present in the allowed set.
VALID_NEXT_STATUSES: dict[str, set] = {
    "PENDING":      {"PROCESSING"},
    "PROCESSING":   {"COMPLETED", "FAILED"},
    "COMPLETED":    {"INDEXING"},
    "INDEXING":     {"INDEXED", "INDEX_FAILED"},
    "FAILED":       set(),
    "INDEXED":      set(),
    "INDEX_FAILED": set(),
    "DELETED":      set(),
}


class UploadRequest(BaseModel):
    source_url: str
    source_headers: Optional[Dict[str, str]] = None
    file_name: str
    metadata: Optional[Dict[str, Any]] = None

class FileResponse(BaseModel):
    file_id: str
    status: str

class StatusUpdateRequest(BaseModel):
    status: str


async def process_upload(file_id: str, upload_request: UploadRequest):
    print(f"Starting upload for {file_id}")

    update_status(file_id, "PROCESSING")

    source_id = (upload_request.metadata or {}).get("id", "")
    file_name = upload_request.file_name
    _notify_webhook(file_id, source_id, "PROCESSING", file_name)

    try:
        async with httpx.AsyncClient(follow_redirects=True) as http:
            async with http.stream(
                "GET",
                upload_request.source_url,
                headers=upload_request.source_headers or {},
            ) as r:
                r.raise_for_status()
                s3_key = f"{file_id}/{file_name}"

                # Buffer into memory then upload via thread pool so boto3's
                # blocking I/O does not stall the FastAPI event loop.
                buf = io.BytesIO()
                async for chunk in r.aiter_bytes(chunk_size=65536):
                    buf.write(chunk)
                buf.seek(0)

                success = await asyncio.to_thread(
                    storage_service.upload_stream, buf, s3_key
                )

                if success:
                    update_file_record(file_id, s3_key, "COMPLETED")
                    _notify_webhook(file_id, source_id, "COMPLETED", file_name)

                    await message_publisher.publish_file_ready(
                        file_id, file_name, upload_request.metadata
                    )
                    print(f"Upload completed for {file_id}")
                else:
                    update_status(file_id, "FAILED")
                    _notify_webhook(file_id, source_id, "FAILED", file_name)
                    print(f"Upload failed for {file_id}")

    except Exception as e:
        print(f"Error processing upload for {file_id}: {e}")
        update_status(file_id, "FAILED")
        _notify_webhook(file_id, source_id, "FAILED", file_name)

def save_initial_record(file_id: str, file_name: str, metadata: dict) -> None:
    now = datetime.now(timezone.utc).isoformat()
    source_id = metadata.get("id", "") or ""
    with _new_session() as session:
        file = File(
            id=file_id,
            file_name=file_name,
            file_metadata=json.dumps(metadata),
            status="PENDING",
            status_updated_at=now,
            source_id=source_id,
        )
        session.add(file)
        session.commit()


def update_status(file_id: str, status: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _new_session() as session:
        file = session.get(File, file_id)
        if file:
            file.status = status
            file.status_updated_at = now
            session.add(file)
            session.commit()


def update_file_record(file_id: str, s3_key: str, status: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _new_session() as session:
        file = session.get(File, file_id)
        if file:
            file.s3_key = s3_key
            file.status = status
            file.status_updated_at = now
            session.add(file)
            session.commit()


def get_file_record(file_id: str) -> File | None:
    with _new_session() as session:
        return session.get(File, file_id)


def find_file_by_source_id(source_id: str) -> File | None:
    """O(1) lookup via indexed source_id column."""
    with _new_session() as session:
        statement = select(File).where(
            File.source_id == source_id,
            File.status != "DELETED",
        )
        return session.exec(statement).first()

@app.on_event("startup")
async def startup_event():
    create_db_and_tables()
    try:
        await message_publisher.connect()
    except Exception as exc:
        logging.warning(
            "[startup] RabbitMQ not available, will retry on first publish: %s", exc
        )

    from reconciliation_worker import ReconciliationWorker

    def _sync_notify(file_id: str, source_id: str, status: str, file_name: str) -> None:
        try:
            with httpx.Client() as http:
                http.post(
                    NESTJS_WEBHOOK_URL,
                    json={"file_id": file_id, "source_id": source_id,
                          "status": status, "file_name": file_name},
                    timeout=5.0,
                )
        except Exception:
            pass

    reconciler = ReconciliationWorker(
        engine=engine,
        notify_webhook_fn=_sync_notify,
        update_status_fn=update_status,
    )
    reconciler.start_in_thread()


@app.on_event("shutdown")
async def shutdown_event():
    await message_publisher.close()

@app.post("/files/upload-from-url", status_code=202)
async def upload_from_url(request: UploadRequest, background_tasks: BackgroundTasks):
    file_id = str(uuid.uuid4())

    save_initial_record(file_id, request.file_name, request.metadata or {})
    _notify_webhook(file_id, (request.metadata or {}).get("id", ""), "PENDING", request.file_name)

    background_tasks.add_task(process_upload, file_id, request)

    return {"file_id": file_id, "status": "ACCEPTED"}

@app.get("/files/{file_id}/meta")
async def get_file_meta(file_id: str):
    """Return file metadata regardless of status (no presigned URL generated)."""
    record = get_file_record(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    metadata = {}
    try:
        if record.file_metadata:
            metadata = json.loads(record.file_metadata)
    except Exception:
        pass

    return {
        "file_id": record.id,
        "file_name": record.file_name,
        "status": record.status,
        "s3_key": record.s3_key,
        "metadata": metadata,
    }

@app.patch("/files/{file_id}/status")
async def update_file_status(file_id: str, req: StatusUpdateRequest):
    """Allow downstream services (e.g. data-ingestion) to push status updates."""
    record = get_file_record(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if record.status == "DELETED":
        return {"file_id": file_id, "status": "DELETED", "skipped": True}
    # Forward-only transition guard: reject backwards/invalid moves.
    allowed = VALID_NEXT_STATUSES.get(record.status, set())
    if req.status not in allowed:
        raise HTTPException(
            status_code=409,
            detail={
                "skipped": True,
                "reason": "invalid_transition",
                "from": record.status,
                "to": req.status,
            },
        )
    update_status(file_id, req.status)
    source_id = ""
    try:
        source_id = json.loads(record.file_metadata or "{}").get("id", "")
    except Exception:
        pass
    _notify_webhook(file_id, source_id, req.status, record.file_name or "")
    return {"file_id": file_id, "status": req.status}

@app.get("/files/{file_id}/download")
async def get_download_url(file_id: str):
    record = get_file_record(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    _S3_READY_STATUSES = {"COMPLETED", "INDEXING", "INDEXED", "INDEX_FAILED"}
    if record.status not in _S3_READY_STATUSES:
        raise HTTPException(status_code=400, detail=f"File is not ready. Status: {record.status}")

    url = storage_service.generate_presigned_url(record.s3_key)
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate download URL")

    return {"download_url": url, "file_name": record.file_name}

@app.get("/files/source/{source_id}")
async def get_by_source_id(source_id: str):
    """Get file metadata based on its source ID (e.g. SharePoint ID)."""
    record = find_file_by_source_id(source_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    metadata = {}
    try:
        if record.file_metadata:
            metadata = json.loads(record.file_metadata)
    except Exception:
        pass

    return {
        "file_id": record.id,
        "file_name": record.file_name,
        "status": record.status,
        "metadata": metadata,
    }

@app.delete("/files/source/{source_id}")
async def delete_by_source_id(source_id: str):
    """Delete a file based on its source ID (e.g. SharePoint ID)."""
    print(f"Request to delete file with source_id: {source_id}")
    record = find_file_by_source_id(source_id)
    if not record:
        # If not found, we can assume it's already deleted or never existed.
        # Return 404 to be explicit, or 200 to be idempotent.
        # Let's return 404 so the caller knows.
        raise HTTPException(status_code=404, detail="File not found")

    file_id = record.id
    print(f"Found file_id: {file_id} for source_id: {source_id}")
    update_status(file_id, "DELETED")
    _notify_webhook(file_id, source_id, "DELETED", record.file_name or "")
    await message_publisher.publish_file_deleted(file_id, source_id)
    return {"status": "DELETED", "file_id": file_id}
