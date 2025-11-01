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
    # Read port and host from environment with sensible defaults
    try:
        port = int(os.environ.get("PORT", 8002))
    except (TypeError, ValueError):
        port = 8002

    host = os.environ.get("APP_HOST", "0.0.0.0")
    # Allow enabling uvicorn reload via RELOAD=true
    reload_env = os.environ.get("RELOAD", "false").lower()
    reload_flag = reload_env in ("1", "true", "yes", "on")

    uvicorn.run(app, host=host, port=port, reload=reload_flag)