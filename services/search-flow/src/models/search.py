from typing import List, Dict, Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(description="The source of the information (e.g., tool name).")
    content: Dict[str, Any] = Field(
        description="The structured tool output or text content."
    )


class SearchResultLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(description="The synthesized answer text.")
    citations: List[Citation] = Field(description="List of raw tool outputs used.")
