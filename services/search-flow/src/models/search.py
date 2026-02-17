from typing import List, Optional, Union, Dict
from pydantic import BaseModel, ConfigDict, Field


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


class FileContent(FileRef):
    model_config = ConfigDict(extra="forbid")
    # Content mapping: chunk_id -> text content
    chunk_contents: Dict[str, str] = Field(
        default_factory=dict, description="Map of chunk_id to its text content."
    )


class Citation(FileRef):
    """
    Represents a citation in the final response.
    It is structurally identical to FileRef (file + list of chunks).
    """

    pass


class SearchResultLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(description="The synthesized answer text.")
    citations: List[Citation] = Field(description="List of file-based citations.")
