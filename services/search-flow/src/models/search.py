from typing import List, Dict, Any, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class ChunkContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["chunk"] = "chunk"
    chunk_id: str = Field(..., description="Unique identifier for the chunk.")
    content: str = Field(..., description="The chunk text.")
    previous_chunk_id: Optional[str] = Field(
        None, description="ID of the preceding chunk."
    )
    next_chunk_id: Optional[str] = Field(None, description="ID of the following chunk.")


class PageContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["page"] = "page"
    page_number: int = Field(..., description="Page number (1-indexed).")
    file_path: str = Field(..., description="Path or name of the source file.")
    content: str = Field(..., description="The page text.")


class SearchContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["search"] = "search"
    query: str = Field(..., description="The search query used.")
    # Search results are a list of items, we can keep it flexible or strict
    results: List[Dict[str, Any]] = Field(
        ..., description="List of search result items."
    )


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(description="The source of the information (e.g., tool name).")
    content: Union[ChunkContent, PageContent, SearchContent] = Field(
        ...,
        discriminator="type",
        description="The structured content (must match strict type).",
    )


class SearchResultLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(description="The synthesized answer text.")
    citations: List[Citation] = Field(description="List of raw tool outputs used.")
