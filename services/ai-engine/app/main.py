from fastapi import APIRouter, FastAPI
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
