from aingo_utils.ssl_bypass import init_ssl_bypass
from aingo_utils.logging import setup_logging
from loguru import logger
init_ssl_bypass()
setup_logging()

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


def _normalize_metadata(file_name: str, metadata: dict, previous_file_name: Optional[str] = None) -> dict:
    normalized = dict(metadata)
    if previous_file_name and previous_file_name != file_name:
        normalized["_previous_file_name"] = previous_file_name
    else:
        normalized.pop("_previous_file_name", None)
    return normalized


async def process_upload(file_id: str, upload_request: UploadRequest, previous_s3_key: Optional[str] = None):
    logger.info(f"Starting upload for {file_id}")

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
                    update_file_record(
                        file_id,
                        s3_key,
                        "COMPLETED",
                        file_name=file_name,
                        metadata=upload_request.metadata or {},
                    )
                    if previous_s3_key and previous_s3_key != s3_key:
                        await asyncio.to_thread(storage_service.delete_object, previous_s3_key)
                    _notify_webhook(file_id, source_id, "COMPLETED", file_name)

                    await message_publisher.publish_file_ready(
                        file_id, file_name, upload_request.metadata
                    )
                    logger.info(f"Upload completed for {file_id}")
                else:
                    update_file_record(
                        file_id,
                        None,
                        "FAILED",
                        file_name=file_name,
                        metadata=upload_request.metadata or {},
                    )
                    _notify_webhook(file_id, source_id, "FAILED", file_name)
                    logger.error(f"Upload failed for {file_id}")

    except Exception as e:
        logger.error(f"Error processing upload for {file_id}: {e}")
        update_file_record(
            file_id,
            None,
            "FAILED",
            file_name=file_name,
            metadata=upload_request.metadata or {},
        )
        _notify_webhook(file_id, source_id, "FAILED", file_name)

def prepare_upload_record(file_name: str, metadata: dict) -> tuple[str, Optional[str], dict]:
    now = datetime.now(timezone.utc).isoformat()
    source_id = metadata.get("id", "") or ""
    with _new_session() as session:
        existing = None
        if source_id:
            statement = (
                select(File)
                .where(File.source_id == source_id, File.status != "DELETED")
                .order_by(File.status_updated_at.desc())  # type: ignore[arg-type]
            )
            existing = session.exec(statement).first()
        normalized_metadata = _normalize_metadata(
            file_name,
            metadata,
            previous_file_name=existing.file_name if existing else None,
        )

        if existing:
            existing.file_name = file_name
            existing.file_metadata = json.dumps(normalized_metadata)
            existing.status = "PENDING"
            existing.status_updated_at = now
            existing.source_id = source_id
            session.add(existing)
            session.commit()
            return existing.id, existing.s3_key, normalized_metadata

        file_id = str(uuid.uuid4())
        file = File(
            id=file_id,
            file_name=file_name,
            file_metadata=json.dumps(normalized_metadata),
            status="PENDING",
            status_updated_at=now,
            source_id=source_id,
        )
        session.add(file)
        session.commit()
        return file_id, None, normalized_metadata


def update_status(file_id: str, status: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _new_session() as session:
        file = session.get(File, file_id)
        if file:
            file.status = status
            file.status_updated_at = now
            session.add(file)
            session.commit()


def update_file_record(
    file_id: str,
    s3_key: Optional[str],
    status: str,
    *,
    file_name: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _new_session() as session:
        file = session.get(File, file_id)
        if file:
            if s3_key is not None:
                file.s3_key = s3_key
            file.status = status
            file.status_updated_at = now
            if file_name is not None:
                previous_file_name = file.file_name if file.file_name != file_name else None
                file.file_name = file_name
            else:
                previous_file_name = None
            if metadata is not None:
                file.file_metadata = json.dumps(
                    _normalize_metadata(file.file_name, metadata, previous_file_name=previous_file_name)
                )
            session.add(file)
            session.commit()


def get_file_record(file_id: str) -> File | None:
    with _new_session() as session:
        return session.get(File, file_id)


def find_files_by_source_id(source_id: str) -> list[File]:
    """Return all non-deleted records for a given source_id, newest first."""
    with _new_session() as session:
        statement = (
            select(File)
            .where(
                File.source_id == source_id,
                File.status != "DELETED",
            )
            .order_by(File.status_updated_at.desc())  # type: ignore[arg-type]
        )
        return list(session.exec(statement).all())


def find_file_by_source_id(source_id: str) -> File | None:
    """Lookup via indexed source_id column, returning the most recently updated non-deleted record."""
    records = find_files_by_source_id(source_id)
    return records[0] if records else None


def find_file_by_name(file_name: str) -> File | None:
    """Lookup by original file_name — returns the most recently created non-deleted record."""
    with _new_session() as session:
        statement = (
            select(File)
            .where(File.file_name == file_name, File.status != "DELETED")
            .order_by(File.status_updated_at.desc())  # type: ignore[arg-type]
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
    file_id, previous_s3_key, normalized_metadata = prepare_upload_record(request.file_name, request.metadata or {})
    request.metadata = normalized_metadata
    _notify_webhook(file_id, (request.metadata or {}).get("id", ""), "PENDING", request.file_name)

    background_tasks.add_task(process_upload, file_id, request, previous_s3_key)

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
        "source_id": record.source_id,
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

    metadata = {}
    try:
        if record.file_metadata:
            metadata = json.loads(record.file_metadata)
    except Exception:
        pass

    return {
        "download_url": url,
        "file_name": record.file_name,
        "source_id": record.source_id,
        "metadata": metadata,
    }

@app.get("/files/by-name/{file_name:path}")
async def get_by_file_name(file_name: str):
    """Look up a file record by its original file name (basename)."""
    record = find_file_by_name(file_name)
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
    """Delete all file records for the given source ID (e.g. SharePoint item ID)."""
    logger.info(f"Request to delete file with source_id: {source_id}")
    records = find_files_by_source_id(source_id)
    if not records:
        raise HTTPException(status_code=404, detail="File not found")

    deleted_ids = []
    for record in records:
        file_id = record.id
        logger.info(f"Marking file_id: {file_id} as DELETED (source_id: {source_id})")
        update_status(file_id, "DELETED")
        _notify_webhook(file_id, source_id, "DELETED", record.file_name or "")
        await message_publisher.publish_file_deleted(file_id, source_id)
        deleted_ids.append(file_id)

    return {"status": "DELETED", "file_ids": deleted_ids}
