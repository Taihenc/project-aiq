from typing import List, Dict, Literal, Optional, Union, Any, Annotated
from pydantic import BaseModel, ConfigDict, Field
from .search import (
    Citation,
    ChunkContent,
    PageContent,
    SearchContent,
)


class ValidationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["reject", "ask", "search", "lookup", "chat"] = Field(
        ..., description="The decision action: reject, ask, search, lookup, or chat."
    )
    intent: str = Field(
        ..., description="The sophisticated intent/instruction for the next crew."
    )
    context: List[
        Annotated[
            Union[ChunkContent, PageContent, SearchContent], Field(discriminator="type")
        ]
    ] = Field(default_factory=list, description="Filtered relevant context.")
    language: str = Field(..., description="The detected language of the user query.")
    response: str = Field(
        ...,
        description="The response content. If reject: actionable advice. If chat: the reply. If others: reasoning.",
    )


class AskOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str = Field(..., description="The direct answer from the context.")


class LookupOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(..., description="The retrieved content summary.")
    details: List[Union[PageContent, ChunkContent]] = Field(
        default_factory=list, description="Specific retrieved items (Pages/Chunks)."
    )


class SearchOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str = Field(..., description="The synthesized answer from search.")
    details: List[SearchContent] = Field(
        default_factory=list, description="Search results."
    )


class FlowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["chat", "search", "reject", "lookup", "ask"] = Field(
        ..., description="The action taken."
    )
    response: str = Field(..., description="The response content.")
    details: Optional[List[Citation]] = Field(
        None, description="List of structured citations/tool outputs."
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

    # Internal Flow Data
    flow_information: str = ""
    validation_output: Optional[ValidationOutput] = None

    # Final Output
    final_response: Optional[FlowResponse] = None
