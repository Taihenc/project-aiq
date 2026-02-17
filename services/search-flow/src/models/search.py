from typing import List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class ChunkRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["chunk"] = "chunk"
    chunk_id: str = Field(..., description="Unique identifier for the chunk.")
    file_path: str = Field(..., description="Path or name of the source file.")
    page_number: int = Field(..., description="Page number (1-indexed).")


class PageRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["page"] = "page"
    page_number: int = Field(..., description="Page number (1-indexed).")
    file_path: str = Field(..., description="Path or name of the source file.")
    page_id: str = Field(..., description="Unique identifier for the page.")


class SearchRef(ChunkRef):
    model_config = ConfigDict(extra="forbid")
    type: Literal["search"] = "search"
    score: float = Field(..., description="Relevance score.")


class ChunkContent(ChunkRef):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(..., description="The chunk text.")


class PageContent(PageRef):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(..., description="The page text.")


class SearchContent(SearchRef):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(..., description="The result text.")


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Literal["search", "page", "chunk"] = Field(
        ..., description="The source type of the citation."
    )
    data: Union[SearchRef, PageRef, ChunkRef] = Field(
        ..., description="The structured content reference."
    )


class SearchResultLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(description="The synthesized answer text.")
    citations: List[Citation] = Field(description="List of raw tool outputs used.")
