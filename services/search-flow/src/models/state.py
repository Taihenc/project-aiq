from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from .search import FileRef


class FlowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    response: str = Field(..., description="The response content.")
    citations: Optional[List[FileRef]] = Field(
        None,
        description="List of file-based citations. Each citation groups chunks by file_path.",
    )


class FlowState(BaseModel):
    # Inputs
    query: str = ""
    context: str = ""
    history: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    mode: Literal["auto", "search", "lookup", "chat"] = Field(default="auto")

    # Final Output Storage
    final_response: Optional[FlowResponse] = None
