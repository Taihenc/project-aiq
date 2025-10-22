from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.routes.route_v1 import router as route_v1
from app.services.embedding.embedding_service import embedding_service
from app.services.qdrant.qdrant_service import qdrant_service
import logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events
    """
    # Startup
    print("Starting up...")
    embedding_service.load_model()
    qdrant_service.connect()
    print("Application ready!")
    
    yield
    
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Embedding service with Qdrant and BGE-M3",
    lifespan=lifespan
)    

app.include_router(route_v1, prefix="/api/v1", tags=["documents"])

@app.get("/")
async def root():
    return {"message": "Embedding Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "embedding-service"}


@app.post("/upload")
async def upload_document(file: dict):
    # Placeholder for document upload and processing
    return {"document_id": "doc-123", "chunks_count": 5}


@app.post("/search")
async def search_documents(query: dict):
    # Placeholder for vector similarity search
    return {"results": [], "query": query.get("text", "")}


@app.get("/documents")
async def list_documents():
    # Placeholder for document listing
    return {"documents": []}


@app.post("/query")
async def query_documents(filter: dict):
    # Placeholder for metadata querying
    return {"results": []}


@app.delete("/delete")
async def delete_document(document_id: str):
    # Placeholder for document deletion
    return {"deleted": True, "document_id": document_id}


@app.put("/edit")
async def edit_document(document_id: str, updates: dict):
    # Placeholder for document editing
    return {"updated": True, "document_id": document_id}


@app.get("/get/{document_id}")
async def get_document(document_id: str):
    # Placeholder for document retrieval
    return {"document_id": document_id, "content": "placeholder content"}
