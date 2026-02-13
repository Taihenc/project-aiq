from typing import List, Dict, Literal, Optional, Union, Any, Annotated
from pydantic import BaseModel, ConfigDict, Field
from .search import (
    Citation,
    ChunkContent,
    PageContent,
    SearchContent,
)


class IntentOutput(BaseModel):
    action: Literal["chat", "search", "reject"] = Field(
        ..., description="The classified intent of the user."
    )
    description: str = Field(
        ..., description="Reasoning for the decision or the rejection message."
    )


class CapabilityItem(BaseModel):
    capability: Literal["graph_search", "search", "page_lookup", "context_load"]
    query: str = Field(
        ..., description="The specific query or parameter for this capability."
    )


class CapabilityPlan(BaseModel):
    tasks: List[CapabilityItem] = Field(
        ..., description="List of capabilities to execute."
    )


class FlowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["chat", "search", "reject", "no_skill"] = Field(
        ..., description="The action taken."
    )
    response: str = Field(..., description="The response content.")
    details: Optional[List[Citation]] = Field(
        None, description="List of structured citations/tool outputs."
    )


class FlowState(BaseModel):
    query: str = ""
    context: List[
        Annotated[
            Union[ChunkContent, PageContent, SearchContent], Field(discriminator="type")
        ]
    ] = Field(default_factory=list)
    history: List[str] = Field(default_factory=list)
    intent: Optional[IntentOutput] = None
    capabilities: List[CapabilityItem] = Field(default_factory=list)
    hyde_result: str = ""
    search_results: str = ""
    final_response: Optional[FlowResponse] = None
