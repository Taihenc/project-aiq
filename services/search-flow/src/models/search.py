from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# === Output models (sent back to user — no text) ===


class ChunkMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")
    chunk_number: int = Field(..., description="Order of the chunk.")
    page_number: int = Field(..., description="Page number (1-indexed).")
    score: Optional[float] = Field(None, description="Relevance score.")


class FileRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    file_path: str = Field(..., description="Path or name of the source file.")
    chunks: List[ChunkMetadata] = Field(
        ..., description="List of relevant chunks in this file."
    )
