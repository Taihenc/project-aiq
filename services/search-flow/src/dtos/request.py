from typing import List, Any
from pydantic import BaseModel, Field
from src.models.search import FileRef


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    attachments: List[FileRef] = Field(default=[])
