from typing import List, Any, Optional, Literal
from pydantic import BaseModel, Field
from src.models.search import FileRef


class SearchFilter(BaseModel):
    file_name: Optional[str] = Field(default=None, description="File name filter")
    file_path: Optional[str] = Field(default=None, description="Path filter")
    file_type: Optional[str] = Field(default=None, description="File type filter")
    pages: Optional[List[int]] = Field(default=None, description="Page filter")
    department: Optional[str] = Field(default=None, description="Department filter")
    team: Optional[str] = Field(default=None, description="Team filter")
    project: Optional[str] = Field(default=None, description="Project filter")
    tags: Optional[List[str]] = Field(default=None, description="Tags filter")


class SearchChatRequest(BaseModel):
    title: Optional[str] = Field(default=None)
    query: str
    history: List[str] = []
    attachments: List[FileRef] = Field(default=[])
    exclude: List[FileRef] = Field(default=[])
    filter: Optional[SearchFilter] = Field(default=None)
    metadata: Optional[dict] = Field(default={})
    mode: Literal["auto", "search", "lookup", "chat"] = Field(default="auto")
