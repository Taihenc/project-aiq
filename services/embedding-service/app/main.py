from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings
from app.routes.route_crud import router as route_crud
from app.routes.route_tools import router as route_tools
from app.services.embedding.embedding_service import embedding_service
from app.services.qdrant.qdrant_service import qdrant_service
from app.services.reranking.reranking_service import reranking_service
# from app.mcp.tools import mcp


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    
    try:
        embedding_service.load_model()
    except Exception as e:
        print(f"Warning: Failed to load embedding model: {e}")

    try:
        qdrant_service.connect()
    except Exception as e:
        print(f"Warning: Failed to connect to Qdrant: {e}")

    try:
        reranking_service.load_model()
    except Exception as e:
        print(f"Warning: Failed to load reranking model: {e}")
    print("Application ready!")
    
    yield
    
    print("Shutting down...")

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Embedding service with Qdrant and BGE-M3",
    lifespan=lifespan
)    

app.include_router(route_crud, prefix="/v1", tags=["CRUD"])
app.include_router(route_tools, prefix="/v1", tags=["tools"])

@app.get("/")
async def root():
    return {"message": "Embedding Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "embedding-service"}
