from typing import List, Dict, Literal, Optional, Union, Any, Annotated
from pydantic import BaseModel, ConfigDict, Field
from .search import (
    Citation,
    ChunkContent,
    PageContent,
    SearchContent,
)


class FlowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["chat", "search", "reject", "lookup"] = Field(
        ..., description="The action taken."
    )
    response: str = Field(..., description="The response content.")
    citations: Optional[List[Citation]] = Field(
        None,
        description="List of structured citations (source, data). Metadata Only (ChunkRef, PageRef, SearchRef).",
    )


class FlowState(BaseModel):
    # Inputs
    query: str = ""
    context: List[
        Annotated[
            Union[ChunkContent, PageContent, SearchContent], Field(discriminator="type")
        ]
    ] = Field(default_factory=list)
    history: List[str] = Field(default_factory=list)

    # Final Output Storage (Future Ready)
    final_response: Optional[FlowResponse] = None
