from fastapi import FastAPI, UploadFile, File
import os
import uvicorn
from typing import Optional

from workers.ingestion_worker import IngestionWorker
from config import settings

# Conditional SSL Bypass for corporate proxy (only when VERIFY_SSL=false)
if not settings.verify_ssl:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.poolmanager import PoolManager
    import ssl

    class NoVerifyAdapter(HTTPAdapter):
        def init_poolmanager(self, connections, maxsize, block=False):
            self.poolmanager = PoolManager(
                num_pools=connections,
                maxsize=maxsize,
                block=block,
                cert_reqs=ssl.CERT_NONE
            )

    # Monkeypatch requests to skip verification globally
    _original_session = requests.Session
    class NoVerifySession(requests.Session):
        def __init__(self):
            super().__init__()
            self.verify = False
            self.mount("https://", NoVerifyAdapter())
            self.mount("http://", NoVerifyAdapter())

    requests.Session = NoVerifySession
    # Also patch the default verify for basic calls
    requests.get = lambda url, **kwargs: _original_session().get(url, verify=False, **kwargs)
    requests.post = lambda url, **kwargs: _original_session().post(url, verify=False, **kwargs)
    requests.head = lambda url, **kwargs: _original_session().head(url, verify=False, **kwargs)


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
