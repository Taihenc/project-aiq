from aingo_utils.ssl_bypass import init_ssl_bypass
import os
init_ssl_bypass()

from fastapi import FastAPI, UploadFile, File
import uvicorn
from typing import Optional

from workers.ingestion_worker import IngestionWorker
from config import settings


app = FastAPI(title="Data Ingestion Service", version="1.0.0")

UPLOAD_DIR = settings.upload_dir
os.makedirs(UPLOAD_DIR, exist_ok=True)

ingestion_workder = IngestionWorker()

@app.get("/")
async def root():
    return {"message": "Data Ingestion Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-engine"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...),chunking: bool = True,format: bool = True, qdrant_upload: bool = True):

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    response = await ingestion_workder.ingest(file_path=file_path, chunking=chunking, format=format, qdrant_upload=qdrant_upload)

    return response


if __name__ == "__main__":
    try:
        port = int(os.environ.get("PORT", 8002))
    except (TypeError, ValueError):
        port = 8002

    host = os.environ.get("APP_HOST", "0.0.0.0")
    reload_env = os.environ.get("RELOAD", "false").lower()
    reload_flag = reload_env in ("1", "true", "yes", "on")

    uvicorn.run(app, host=host, port=port, reload=reload_flag)

@app.on_event("startup")
async def startup_event():
    from workers.event_consumer import EventConsumer
    # Store consumer in app.state to prevent garbage collection
    app.state.event_consumer = EventConsumer()
    app.state.event_consumer.start_in_thread()
