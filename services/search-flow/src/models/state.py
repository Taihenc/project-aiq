from typing import List, Literal, Optional, Any
from pydantic import BaseModel, ConfigDict, Field
from .search import Citation, FileContent


class FlowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["chat", "search", "reject", "lookup"] = Field(
        ..., description="The action taken."
    )
    response: str = Field(..., description="The response content.")
    citations: Optional[List[Citation]] = Field(
        None,
        description="List of file-based citations. Each citation groups chunks by file_path.",
    )


class FlowState(BaseModel):
    # Inputs
    query: str = ""
    context: List[Any] = Field(default_factory=list)
    history: List[str] = Field(default_factory=list)

    # Final Output Storage
    final_response: Optional[FlowResponse] = None
