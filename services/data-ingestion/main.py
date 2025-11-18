from fastapi import FastAPI, UploadFile, File
import os
import uvicorn

app = FastAPI(title="Data Ingestion Service", version="1.0.0")


@app.get("/")
async def root():
    return {"message": "AI Engine Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-engine"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    return {"message": "Document uploaded successfully"}


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
    consumer = EventConsumer()
    consumer.start_in_thread()
