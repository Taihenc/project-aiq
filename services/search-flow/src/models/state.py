from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from .search import FileRef


class FlowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(
        ...,
        description="A short, descriptive title for the conversation based on the query, or the same title provided in the context.",
    )
    response: str = Field(..., description="The response content.")
    citations: Optional[List[FileRef]] = Field(
        None,
        description="List of file-based citations. Each citation groups chunks by file_path.",
    )


class HyDEResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(
        ...,
        description="A short, descriptive title for the hypothetical document snippet.",
    )
    query: str = Field(
        ...,
        description="The generated hypothetical document snippet answering the original query.",
    )


class FlowState(BaseModel):
    # Inputs
    query: str = ""
    context: str = ""
    history: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    mode: Literal["auto", "search", "lookup", "chat"] = Field(default="auto")
    title: Optional[str] = None

    # Final Output Storage
    final_response: Optional[FlowResponse] = None
