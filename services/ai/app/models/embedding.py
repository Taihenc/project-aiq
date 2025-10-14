from typing import List, Optional
from pydantic import BaseModel
from app.config import settings


class SearchRequest(BaseModel):
    query: str
    file_path_filter: Optional[str] = None
    limit: Optional[int] = settings.SEARCH_RESULTS_LIMIT


class DocumentResponse(BaseModel):
    document_id: str
    content: str
    path: Optional[str] = None
    score: Optional[float] = None


class SearchResponse(BaseModel):
    results: List[DocumentResponse]

class Document(BaseModel):
    document_id: str
    content: str
    file_path: Optional[str] = None

class UploadRequest(BaseModel):
    documents: List[Document]
    limit: Optional[int] = settings.UPLOAD_RESULTS_LIMIT

class UploadResponse(BaseModel):
    results: List[str]

