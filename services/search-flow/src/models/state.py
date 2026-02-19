from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from .search import FileRef, FileContent


class FlowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["chat", "search", "reject", "lookup"] = Field(
        ..., description="The action taken."
    )
    response: str = Field(..., description="The response content.")
    citations: Optional[List[FileRef]] = Field(
        None,
        description="List of file-based citations. Each citation groups chunks by file_path.",
    )

    @model_validator(mode="before")
    @classmethod
    def reject_citations_for_non_search(cls, data):
        """Reject citations on chat/reject — forces LLM to retry without them."""
        action = (
            data.get("action")
            if isinstance(data, dict)
            else getattr(data, "action", None)
        )
        citations = (
            data.get("citations")
            if isinstance(data, dict)
            else getattr(data, "citations", None)
        )
        if action in ("chat", "reject") and citations:
            raise ValueError(
                f"citations must be null when action is '{action}'. "
                "Only 'search' and 'lookup' actions may include citations."
            )
        return data


class FlowState(BaseModel):
    # Inputs
    query: str = ""
    context: List[FileContent] = Field(default_factory=list)
    history: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    mode: Literal["auto", "search", "lookup", "chat"] = Field(default="auto")

    # Final Output Storage
    final_response: Optional[FlowResponse] = None
