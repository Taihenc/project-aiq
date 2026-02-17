from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# === Output models (sent back to user — no text) ===


class ChunkMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")
    chunk_id: str = Field(..., description="Unique identifier for the chunk.")
    page_number: int = Field(..., description="Page number (1-indexed).")
    score: Optional[float] = Field(None, description="Relevance score.")


class FileRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    file_path: str = Field(..., description="Path or name of the source file.")
    chunks: List[ChunkMetadata] = Field(
        ..., description="List of relevant chunks in this file."
    )


class Citation(FileRef):
    """
    Represents a citation in the final response.
    It is structurally identical to FileRef (file + list of chunks).
    """

    pass


# === Internal models (fed to LLM — includes text) ===


class ChunkContent(ChunkMetadata):
    """ChunkMetadata enriched with the actual text content."""

    text: str = Field("", description="Text content of this chunk.")


class FileContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    file_path: str = Field(..., description="Path or name of the source file.")
    chunks: List[ChunkContent] = Field(
        ..., description="List of chunks with text content."
    )


# === Logging ===


class SearchResultLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(description="The synthesized answer text.")
    citations: List[Citation] = Field(description="List of file-based citations.")
