from typing import List, Optional
from pydantic import BaseModel, Field


class EmbeddingChunk(BaseModel):
    chunk_number: int = Field(...)
    text: Optional[str] = Field(None, description="Text content")
    score: Optional[float] = Field(None, description="Relevance score.")
    # We might not need metadata for the request, but it's in the model
    metadata: Optional[dict] = Field(None, description="Additional metadata")


class EmbeddingPage(BaseModel):
    page_number: int = Field(...)
    chunks: List[EmbeddingChunk] = Field(
        ..., description="List of relevant chunks in this page."
    )


class EmbeddingFile(BaseModel):
    file_path: str = Field(..., description="Path or name of the source file.")
    pages: List[EmbeddingPage] = Field(
        ..., description="List of relevant pages in this file."
    )


class FileReferenceRequest(BaseModel):
    files: List[EmbeddingFile] = Field(...)


class FileReferenceResponse(BaseModel):
    result: str
