from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

class MetaData(BaseModel):
    order: int = Field(default=0, description="order")
    file: str = Field(default="example.pdf", description="file name")
    file_path: str = Field(default="/example/example.pdf", description="file path")
    file_type: str = Field(default="pdf", description="file type")
    pages: List[int] = Field(default=[1], description="file pages")
    department: str = Field(default="AI", description="department")
    project: str = Field(default="Aingo", description="project")
    team: str = Field(default="AiQ", description="team")
    tags: List[str] = Field(default=[], description="tags")
    is_summary: Optional[bool] = Field(default=None, description="is summary", nullable=True)
    sheet_name: Optional[str] = Field(default=None, description="sheet name", nullable=True)
    columns: Optional[List[str]] = Field(default=None, description="columns", nullable=True)
    created_at: Optional[str] = Field(default="", description="created time", nullable=True)
    checksum: Optional[str] = Field(default="", description="checksum of byte", nullable=True)
    file_id: Optional[str] = Field(default=None, description="stable file id", nullable=True)
    source_id: Optional[str] = Field(default=None, description="stable upstream source id", nullable=True)
    max_page: Optional[int] = Field(default=None, description="max page number in file", nullable=True)
    max_order: Optional[int] = Field(default=None, description="max chunk order in file", nullable=True)

class Chunk(BaseModel):
    chunk_number: int = Field(...)
    text: Optional[str] = Field(None, description="Text content")
    score: Optional[float] = Field(None, description="Relevance score.")
    metadata: Optional[MetaData] = Field(None, description="Additional metadata")

class Page(BaseModel):
    page_number: int = Field(...)
    chunks: List[Chunk] = Field(..., description="List of relevant chunks in this page.")
    total_chunk: Optional[int] = Field(None, description="Total number of chunks in the page.")

class File(BaseModel):
    file_path: str = Field(..., description="Path or name of the source file.")
    pages: Optional[List[Page]] = Field(None, description="List of relevant pages in this file.")
    chunks: Optional[List[Chunk]] = Field(None, description="List of relevant chunks in this file.")
    total_pages: Optional[int] = Field(None, description="Total number of pages in the file.")

class DocumentUpload(BaseModel):
    text: str = Field(default="Ecotourism and nature conservation in tourist destinations across the country", description="Text content to embed")
    metadata: MetaData = Field(..., description="Additional metadata")

class DocumentUploadRequest(BaseModel):
    documents: List[DocumentUpload] = Field(..., description="List of documents to upload")
    file_id: Optional[str] = Field(
        default=None,
        description=(
            "Optional FSS file_id. When provided and FSS_CALLBACK_URL env is set, "
            "the embedding service will PATCH FSS status to INDEXED after a "
            "successful upload — acting as a direct confirmation path alongside "
            "the data-ingestion worker's _update_fss_status call."
        ),
    )

class DocumentUploadResponse(BaseModel):
    ids: List[str] = Field(..., description="List of uploaded document IDs")
    count: int = Field(..., description="Number of documents uploaded")
    message: str = Field(default="Documents uploaded successfully")

class FilterIn(BaseModel):
    file_name: Optional[str] = Field(default="",description="File name filter",nullable=True)
    file_path: Optional[str] = Field(default="",description="Path filter",nullable=True)
    file_type: Optional[str] = Field(default="",description="File type filter",nullable=True)
    pages: Optional[List[int]] = Field(default=[],description="Page filter",nullable=True)
    department: Optional[str] = Field(default="",description="Department filter",nullable=True)
    team: Optional[str] = Field(default="",description="Team filter",nullable=True)
    project: Optional[str] = Field(default="",description="Project filter",nullable=True)
    tags: Optional[List[str]] = Field(default=[],description="Tags filter",nullable=True)

class FilterOut(BaseModel):
    files: Optional[List[File]] = Field(None, description="List of files")
    exclude_file_ids: Optional[List[str]] = Field(default=[],description="List of stable file ids to exclude",nullable=True)
    exclude: Optional[List[str]] = Field(default=[],description="List of document path to exclude",nullable=True)

class FilterOptionsResponse(BaseModel):
    """Unique metadata values present in the Qdrant collection — used to populate filter pickers."""
    department: List[str] = Field(default_factory=list, description="Distinct department values")
    team: List[str] = Field(default_factory=list, description="Distinct team values")
    project: List[str] = Field(default_factory=list, description="Distinct project values")
    tags: List[str] = Field(default_factory=list, description="Distinct tag values (flattened across all chunks)")
    file_type: List[str] = Field(default_factory=list, description="Distinct file_type values")


class FileStatusResponse(BaseModel):
    """Response from GET /v1/file-status — used by reconciliation watchdog."""
    file_name: str
    indexed: bool = Field(..., description="True when at least one chunk exists in Qdrant")
    chunk_count: int = Field(..., description="Number of Qdrant points for this file")


class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query text")
    top_k: int = Field(default=5, ge=1, le=100, description="Number of results from sematic search")
    top_n: Optional[int] = Field(default=5, ge=1, le=100, description="Number of results from rerank (Leave null for no reranking)")
    score_threshold: Optional[float] = Field(default=0, ge=0.0, le=1.0, description="Minimum similarity score")
    filter_in: Optional[FilterIn] = Field(default=None, description="Metadata filter (include)")
    filter_out: Optional[FilterOut] = Field(default=None, description="Metadata filter (exclude)")

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

class PageRetrievalRequest(BaseModel):
    file_path: str = Field("/example/example.pdf", description="Full path to the csv or xlsx file")
    start_page: int = Field(default=0, description="Start page number")
    end_page: int = Field(default=1000, description="End page number")


# class PageContent(BaseModel):
#     page_number: int = Field(..., description="Page number")
#     ids: List[str] = Field(default=[], description="List of document IDs")
#     text: str = Field(default="", description="Text content")
#     metadata_list: List[MetaData] = Field(default=[], description="Additional metadata")
#     total_chunks: int = Field(..., description="Total number of chunk found")

class PageRetrievalResponse(BaseModel):
    pages: List[Page] = Field(..., description="List of pages")
    total_pages: int = Field(..., description="Total number of pages")

class ChunkContextRequest(BaseModel):
    file_path: str = Field(..., description="Full path file")
    chunk_number: int = Field(..., description="The number of the target chunk")
    backward: int = Field(0, description="Number of chunks to retrieve before the target", ge=0)
    forward: int = Field(0, description="Number of chunks to retrieve after the target", ge=0)

class ChunkContextResponse(BaseModel):
    chunks: List[DocumentResponse]


class StructuredQueryRequest(BaseModel):
    file_path: str = Field(..., description="Full path to the csv or xlsx file")
    sheet_name: Optional[str] = Field(None, description="The specific sheet name to query (Required for Excel)")
    query: Optional[str] = Field(None, description="Pandas query expression. If blank, returns data preview.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "file_path": "/path/to/data.csv",
                "query": "department == 'Engineering' and salary > 50000"
            }
        }
    }

class StructuredQueryResponse(BaseModel):
    result: str
    metadata: Dict[str, Any]
    success: bool
    error: Optional[str] = None

class FileReferenceRequest(BaseModel):
    files: List[File] = Field(...)

class FileReferenceResponse(BaseModel):
    result: str

# Structured per-chunk response (for frontend citation enrichment)
class EnrichedChunk(BaseModel):
    chunk_number: int
    score: Optional[float] = None
    content: str

class EnrichedPage(BaseModel):
    page_number: int
    chunks: List[EnrichedChunk]

class EnrichedFile(BaseModel):
    file_path: str
    pages: List[EnrichedPage]

class StructuredFileReferenceResponse(BaseModel):
    files: List[EnrichedFile]
