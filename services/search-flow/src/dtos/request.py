from typing import List, Any, Optional, Literal
from pydantic import BaseModel, Field
from src.models.search import FileRef


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    attachments: List[FileRef] = Field(default=[])
    metadata: Optional[dict] = Field(default={})
    mode: Literal["auto", "search", "lookup", "chat"] = Field(default="auto")
