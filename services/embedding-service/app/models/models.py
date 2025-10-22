from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class DocumentUpload(BaseModel):
    text: str = Field(..., description="Text content to embed")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")


class DocumentBatchUpload(BaseModel):
    documents: List[DocumentUpload] = Field(..., description="List of documents to upload")


class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query text")
    limit: int = Field(default=10, ge=1, le=100, description="Number of results to return")
    score_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Minimum similarity score")
    filter: Optional[Dict[str, Any]] = Field(default=None, description="Metadata filter")


class QueryRequest(BaseModel):
    text: str = Field(..., description="Text to get embedding for")


class DocumentUpdate(BaseModel):
    text: Optional[str] = Field(None, description="Updated text content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Updated metadata")


class DocumentResponse(BaseModel):
    id: str = Field(..., description="Document ID")
    text: str = Field(..., description="Document text")
    metadata: Dict[str, Any] = Field(default={}, description="Document metadata")
    score: Optional[float] = Field(None, description="Similarity score (for search results)")


class UploadResponse(BaseModel):
    id: str = Field(..., description="Uploaded document ID")
    message: str = Field(default="Document uploaded successfully")


class BatchUploadResponse(BaseModel):
    ids: List[str] = Field(..., description="List of uploaded document IDs")
    count: int = Field(..., description="Number of documents uploaded")
    message: str = Field(default="Documents uploaded successfully")


class DeleteResponse(BaseModel):
    message: str = Field(default="Document deleted successfully")


class UpdateResponse(BaseModel):
    id: str = Field(..., description="Updated document ID")
    message: str = Field(default="Document updated successfully")


class EmbeddingResponse(BaseModel):
    embedding: List[float] = Field(..., description="Vector embedding")
    dimension: int = Field(..., description="Embedding dimension")


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int = Field(..., description="Total number of documents")
    limit: Optional[int] = Field(None, description="Limit applied")
    offset: Optional[int] = Field(None, description="Offset applied")
