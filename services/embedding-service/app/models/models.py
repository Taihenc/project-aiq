from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

class MetaData(BaseModel):
    file: Optional[str] = Field(default="", description="file name")
    file_path: Optional[str] = Field(default="", description="file path")
    file_type: Optional[str] = Field(default="", description="file type")
    page: Optional[int] = Field(default=-1, description="file page")
    created_at: Optional[str] = Field(default="", description="created time")
    checksum: Optional[str] = Field(default="", description="checksum of byte")

class DocumentUpload(BaseModel):
    text: str = Field(default="Ecotourism and nature conservation in tourist destinations across the country", description="Text content to embed")
    metadata: MetaData = Field(..., description="Additional metadata")

class DocumentUploadRequest(BaseModel):
    documents: List[DocumentUpload] = Field(..., description="List of documents to upload")

class DocumentUploadResponse(BaseModel):
    ids: List[str] = Field(..., description="List of uploaded document IDs")
    count: int = Field(..., description="Number of documents uploaded")
    message: str = Field(default="Documents uploaded successfully")

class SearchFilter(BaseModel):
    path: Optional[str] = Field(default="", description="Path filter")

class SearchRequest(BaseModel):
    query: str = Field("artificial intelligence", description="Search query text")
    top_k: int = Field(default=10, ge=1, le=100, description="Number of results from sematic search")
    top_n: Optional[int] = Field(default=10, ge=1, le=100, description="Number of results from rerank (Leave null for no reranking)")
    score_threshold: Optional[float] = Field(default=0, ge=0.0, le=1.0, description="Minimum similarity score")
    filter: Optional[SearchFilter] = Field(default=None, description="Metadata filter")

class DocumentResponse(BaseModel):
    id: str = Field(..., description="Document ID")
    text: str = Field(..., description="Document text")
    metadata: MetaData = Field(..., description="Additional metadata")
    similarity_score: Optional[float] = Field(None, description="Similarity score (for search results)")
    reranking_score: Optional[float] = Field(None, description="Reranking score (for search results)")

class SearchResponse(BaseModel):
    documents: List[DocumentResponse] = Field(..., description="Search Documents")
    counts: int = Field(None, description="Number of Document")

class DocumentsRequest(BaseModel):
    limit: Optional[int] = Field(default=100, ge=1, le=1000, description="Maximum number of documents to return")
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
    metadata: MetaData = Field(..., description="Additional metadata")

class DocumentUpdateResponse(BaseModel):
    id: str = Field(..., description="Updated document ID")
    message: str = Field(default="Document updated successfully")

class DocumentDeleteResponse(BaseModel):
    message: str = Field(default="Document deleted successfully")

# ==========================================
# NEW TOOL MODELS
# ==========================================

class PageFilter(BaseModel):
    file_path: Optional[str] = None
    directory: Optional[str] = None
    mime_type: Optional[str] = None
    tags: Optional[List[str]] = None
    department: Optional[str] = None
    team: Optional[str] = None
    project: Optional[str] = None

class PageNavigation(BaseModel):
    anchor_page_num: int = Field(..., description="The reference page number")
    page_range: int = Field(1, ge=0, description="Number of additional pages to retrieve")
    mode: Literal['exact', 'forward', 'next', 'backward', 'prev', 'around', 'both'] = Field(
        'exact', description="Direction: 'forward', 'backward', or 'around'"
    )

class PageRetrievalRequest(BaseModel):
    filter: Optional[PageFilter] = None
    navigation: Optional[PageNavigation] = None

class PageContent(BaseModel):
    page_number: int
    text: str
    file_path: str
    metadata: Dict[str, Any]

class PageRetrievalResponse(BaseModel):
    pages: List[PageContent]
    total_found: int

class StructuredQueryRequest(BaseModel):
    file_path: str = Field(..., description="Full path to the csv or xlsx file")
    sheet_name: Optional[str] = Field(None, description="The specific sheet name to query (Required for Excel)")
    query: Optional[str] = Field(None, description="Pandas query expression. If blank, returns data preview.")

class StructuredQueryResponse(BaseModel):
    result: str
    metadata: Dict[str, Any]
    success: bool
    error: Optional[str] = None