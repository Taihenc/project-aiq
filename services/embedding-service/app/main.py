from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings
from app.routes.route_v1 import router as route_v1
from app.services.embedding.embedding_service import embedding_service
from app.services.qdrant.qdrant_service import qdrant_service
from app.services.mock_doc import mock_service
from app.services.reranking.reranking_service import reranking_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    
    embedding_service.load_model()
    qdrant_service.connect()
    mock_service.mock()
    reranking_service.load_model()
    print("Application ready!")
    
    yield
    
    print("Shutting down...")

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Embedding service with Qdrant and BGE-M3",
    lifespan=lifespan
)    

app.include_router(route_v1, prefix="/v1", tags=["documents"])

@app.get("/")
async def root():
    return {"message": "Embedding Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "embedding-service"}
