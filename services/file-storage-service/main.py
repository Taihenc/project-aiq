from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
import requests
import sqlite3
import os
import json
from core.storage import StorageService
from core.messaging import MessagePublisher

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


def process_upload(file_id: str, upload_request: UploadRequest):
    print(f"Starting upload for {file_id}")

    update_status(file_id, "PROCESSING")

    try:
        with requests.get(upload_request.source_url, headers=upload_request.source_headers, stream=True) as r:
            r.raise_for_status()
            s3_key = f"{file_id}/{upload_request.file_name}"

            success = storage_service.upload_stream(r.raw, s3_key)

            if success:
                update_file_record(file_id, s3_key, "COMPLETED")

                message_publisher.publish_file_ready(file_id, upload_request.file_name, upload_request.metadata)
                print(f"Upload completed for {file_id}")
            else:
                update_status(file_id, "FAILED")
                print(f"Upload failed for {file_id}")

    except Exception as e:
        print(f"Error processing upload for {file_id}: {e}")
        update_status(file_id, "FAILED")

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

    background_tasks.add_task(process_upload, file_id, request)

    return {"file_id": file_id, "status": "ACCEPTED"}

@app.get("/files/{file_id}/download")
async def get_download_url(file_id: str):
    record = get_file_record(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    if record['status'] != 'COMPLETED':
        raise HTTPException(status_code=400, detail=f"File is not ready. Status: {record['status']}")

    url = storage_service.generate_presigned_url(record['s3_key'])
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate download URL")

    return {"download_url": url}

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
    message_publisher.publish_file_deleted(file_id, source_id)
    return {"status": "DELETED", "file_id": file_id}
