from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any



class DocumentUpload(BaseModel):
    text: str = Field(default="Ecotourism and nature conservation in tourist destinations across the country", description="Text content to embed")
    metadata: Optional[Dict[str, Any]] = Field(default={"path":"/documents/tourism/eco/nature_conservation.md"}, description="Additional metadata")


class DocumentUploadRequest(BaseModel):
    documents: List[DocumentUpload] = Field(..., description="List of documents to upload")


class DocumentUploadResponse(BaseModel):
    ids: List[str] = Field(..., description="List of uploaded document IDs")
    count: int = Field(..., description="Number of documents uploaded")
    message: str = Field(default="Documents uploaded successfully")


class SearchFilter(BaseModel):
    path: Optional[str] = Field(default="/", description="Path filter")
    # Add other filters here #


class SearchRequest(BaseModel):
    query: str = Field("artificial intelligence", description="Search query text")
    limit: int = Field(default=10, ge=1, le=100, description="Number of results to return")
    score_threshold: Optional[float] = Field(default=0, ge=0.0, le=1.0, description="Minimum similarity score")
    filter: Optional[SearchFilter] = Field(default=None, description="Metadata filter")


class DocumentResponse(BaseModel):
    id: str = Field(..., description="Document ID")
    text: str = Field(..., description="Document text")
    metadata: Dict[str, Any] = Field(default={}, description="Document metadata")
    score: Optional[float] = Field(None, description="Similarity score (for search results)")


class SearchResponse(BaseModel):
    documents: List[DocumentResponse] = Field(..., description="Search Documents")


class DocumentsRequest(BaseModel):
    limit: Optional[int] = Field(default=100, ge=1, le=1000, description="Maximum number of documents to return"),
    offset: int = Field(0, ge=0, description="Number of documents to skip")
    

class DocumentsResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int = Field(..., description="Total number of documents")
    limit: Optional[int] = Field(None, description="Limit applied")
    offset: Optional[int] = Field(None, description="Offset applied")


class QueryRequest(BaseModel):
    text: str = Field(default="artificial intelligence", description="Text to get embedding for")


class QueryResponse(BaseModel):
    embedding: List[float] = Field(..., description="Vector embedding")
    dimension: int = Field(..., description="Embedding dimension")


class DocumentUpdateRequest(BaseModel):
    text: Optional[str] = Field(default="Update document", description="Updated text content")
    metadata: Optional[Dict[str, Any]] = Field(default={"path": "/update/update_document.txt"}, description="Updated metadata")


class DocumentUpdateResponse(BaseModel):
    id: str = Field(..., description="Updated document ID")
    message: str = Field(default="Document updated successfully")


class DocumentDeleteResponse(BaseModel):
    message: str = Field(default="Document deleted successfully")



