from fastapi import APIRouter, FastAPI
import os
import uvicorn
from app.routes.v1 import agents, crews, completion, models, tools

app = FastAPI(title="AI Engine Service", version="1.0.0")

v1_router = APIRouter(prefix="/v1", tags=["v1"])
v1_router.include_router(models.router)
v1_router.include_router(tools.router)
v1_router.include_router(agents.router)
v1_router.include_router(crews.router)
v1_router.include_router(completion.router)

app.include_router(v1_router)


@app.get("/")
async def root():
    return {"message": "AI Engine Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-engine"}


if __name__ == "__main__":
    # Read port and host from environment with sensible defaults
    try:
        port = int(os.environ.get("PORT", 8001))
    except (TypeError, ValueError):
        port = 8001

    host = os.environ.get("APP_HOST", "0.0.0.0")
    # Allow enabling uvicorn reload via RELOAD=true
    reload_env = os.environ.get("RELOAD", "false").lower()
    reload_flag = reload_env in ("1", "true", "yes", "on")

    uvicorn.run(app, host=host, port=port, reload=reload_flag)
