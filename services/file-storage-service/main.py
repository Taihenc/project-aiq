from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
import requests
import sqlite3
import os
import json
import threading
from core.storage import StorageService
from core.messaging import MessagePublisher

NESTJS_WEBHOOK_URL = os.environ.get(
    "NESTJS_WEBHOOK_URL",
    "http://127.0.0.1:3000/api/v1/sharepoint/webhook/status",
)


def _notify_webhook(file_id: str, source_id: str, status: str, file_name: str = "") -> None:
    """Fire-and-forget: POST status change to NestJS so it can push SSE to clients."""
    def _send():
        try:
            requests.post(
                NESTJS_WEBHOOK_URL,
                json={"file_id": file_id, "source_id": source_id,
                      "status": status, "file_name": file_name},
                timeout=3,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[webhook] Failed to notify NestJS: {exc}")
    threading.Thread(target=_send, daemon=True).start()


def _source_id_from_metadata(metadata_json: str) -> str:
    """Extract SharePoint source_id (item 'id') from JSON metadata string."""
    try:
        return json.loads(metadata_json or "{}").get("id", "")
    except Exception:
        return ""

app = FastAPI()

storage_service = StorageService()
message_publisher = MessagePublisher()

DB_PATH = "file_metadata.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS files
                 (id TEXT PRIMARY KEY, s3_key TEXT, file_name TEXT, metadata TEXT, status TEXT)''')
    conn.commit()
    conn.close()

init_db()

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


def process_upload(file_id: str, upload_request: UploadRequest):
    print(f"Starting upload for {file_id}")

    update_status(file_id, "PROCESSING")

    source_id = (upload_request.metadata or {}).get("id", "")
    file_name = upload_request.file_name
    _notify_webhook(file_id, source_id, "PROCESSING", file_name)

    try:
        with requests.get(upload_request.source_url, headers=upload_request.source_headers, stream=True) as r:
            r.raise_for_status()
            s3_key = f"{file_id}/{file_name}"

            success = storage_service.upload_stream(r.raw, s3_key)

            if success:
                update_file_record(file_id, s3_key, "COMPLETED")
                _notify_webhook(file_id, source_id, "COMPLETED", file_name)

                message_publisher.publish_file_ready(file_id, file_name, upload_request.metadata)
                print(f"Upload completed for {file_id}")
            else:
                update_status(file_id, "FAILED")
                _notify_webhook(file_id, source_id, "FAILED", file_name)
                print(f"Upload failed for {file_id}")

    except Exception as e:
        print(f"Error processing upload for {file_id}: {e}")
        update_status(file_id, "FAILED")
        _notify_webhook(file_id, source_id, "FAILED", file_name)

def save_initial_record(file_id: str, file_name: str, metadata: dict):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO files (id, file_name, metadata, status) VALUES (?, ?, ?, ?)",
              (file_id, file_name, json.dumps(metadata), "PENDING"))
    conn.commit()
    conn.close()

def update_status(file_id: str, status: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE files SET status = ? WHERE id = ?", (status, file_id))
    conn.commit()
    conn.close()

def update_file_record(file_id: str, s3_key: str, status: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE files SET s3_key = ?, status = ? WHERE id = ?", (s3_key, status, file_id))
    conn.commit()
    conn.close()

def get_file_record(file_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM files WHERE id = ?", (file_id,))
    row = c.fetchone()
    conn.close()
    return row

def find_file_by_source_id(source_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM files WHERE status != 'DELETED'")
    rows = c.fetchall()
    conn.close()

    for row in rows:
        try:
            if row['metadata']:
                meta = json.loads(row['metadata'])
                if meta.get('id') == source_id:
                    return row
        except Exception:
            continue
    return None

@app.on_event("startup")
async def startup_event():
    message_publisher.connect()

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
        if record['metadata']:
            metadata = json.loads(record['metadata'])
    except Exception:
        pass

    return {
        "file_id": record['id'],
        "file_name": record['file_name'],
        "status": record['status'],
        "s3_key": record['s3_key'],
        "metadata": metadata,
    }

@app.patch("/files/{file_id}/status")
async def update_file_status(file_id: str, req: StatusUpdateRequest):
    """Allow downstream services (e.g. data-ingestion) to push status updates."""
    record = get_file_record(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    # Never overwrite a terminal DELETED status — a concurrent ingest finishing
    # after a delete must not resurrect the record.
    if record['status'] == 'DELETED':
        return {"file_id": file_id, "status": "DELETED", "skipped": True}
    update_status(file_id, req.status)
    source_id = _source_id_from_metadata(record['metadata'])
    _notify_webhook(file_id, source_id, req.status, record['file_name'] or "")
    return {"file_id": file_id, "status": req.status}

@app.get("/files/{file_id}/download")
async def get_download_url(file_id: str):
    record = get_file_record(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    # Allow download for any status where the file is safely in S3
    _S3_READY_STATUSES = {"COMPLETED", "INDEXING", "INDEXED", "INDEX_FAILED"}
    if record['status'] not in _S3_READY_STATUSES:
        raise HTTPException(status_code=400, detail=f"File is not ready. Status: {record['status']}")

    url = storage_service.generate_presigned_url(record['s3_key'])
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate download URL")

    return {"download_url": url, "file_name": record['file_name']}

@app.get("/files/source/{source_id}")
async def get_by_source_id(source_id: str):
    """Get file metadata based on its source ID (e.g. SharePoint ID)."""
    record = find_file_by_source_id(source_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    metadata = {}
    try:
        if record['metadata']:
            metadata = json.loads(record['metadata'])
    except Exception:
        pass

    return {
        "file_id": record['id'],
        "file_name": record['file_name'],
        "status": record['status'],
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

    file_id = record['id']
    print(f"Found file_id: {file_id} for source_id: {source_id}")
    update_status(file_id, "DELETED")
    _notify_webhook(file_id, source_id, "DELETED", record['file_name'] or "")
    message_publisher.publish_file_deleted(file_id, source_id)
    return {"status": "DELETED", "file_id": file_id}
