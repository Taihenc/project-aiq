from typing import List, Dict, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class VectorResultItem(BaseModel):
    id: str
    score: float
    text: str
    metadata: Dict = Field(default_factory=dict)


class VectorSearchOutput(BaseModel):
    status: Literal["found", "not_found", "error"]
    results: List[VectorResultItem]


class PageLookupOutput(BaseModel):
    status: Literal["success", "error"]
    file: str
    page: int
    content: str


class ChunkLookupOutput(BaseModel):
    status: Literal["success", "error"]
    chunk_id: str
    content: str
    metadata: Optional[Dict] = None
    next_chunk: Optional[str] = None


class GraphRelation(BaseModel):
    source: str
    target: str
    relation: str


class GraphSearchOutput(BaseModel):
    status: Literal["success", "error"]
    relationships: List[GraphRelation]


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Literal[
        "vector_search",
        "page_lookup",
        "chunk_lookup",
        "graph_search",
        "manual_attachment",
    ]
    # The content is now the FULL structured output from the tool
    content: Union[
        VectorSearchOutput,
        PageLookupOutput,
        ChunkLookupOutput,
        GraphSearchOutput,
        str,
    ] = Field(description="The structured tool output or text content.")


class SearchResultLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(description="The synthesized answer text.")
    citations: List[Citation] = Field(description="List of raw tool outputs used.")
