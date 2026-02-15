from typing import List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class ChunkContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["chunk"] = "chunk"
    chunk_id: str = Field(..., description="Unique identifier for the chunk.")
    content: str = Field(..., description="The chunk text.")


class PageContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["page"] = "page"
    page_number: int = Field(..., description="Page number (1-indexed).")
    file_path: str = Field(..., description="Path or name of the source file.")
    content: str = Field(..., description="The page text.")


class SearchContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["search"] = "search"
    content: str = Field(..., description="The result text.")
    score: float = Field(..., description="Relevance score.")
    file_path: str = Field(..., description="Source file path.")
    page_number: int = Field(..., description="Page number.")
    chunk_id: str = Field(..., description="Chunk ID.")


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Literal["search", "page", "chunk"] = Field(
        ..., description="The source type of the citation."
    )
    data: Union[SearchContent, PageContent, ChunkContent] = Field(
        ..., discriminator="type", description="The structured content data."
    )


class SearchResultLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(description="The synthesized answer text.")
    citations: List[Citation] = Field(description="List of raw tool outputs used.")
