from typing import List, Optional, Literal
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
    exclude_file_ids: Optional[List[str]] = Field(default=None, description="Stable file IDs to exclude from search results")
    exclude: Optional[List[str]] = Field(default=None, description="File paths to exclude from search results")


class SearchChatRequest(BaseModel):
    title: Optional[str] = Field(default=None)
    query: str
    history: List[str] = Field(default_factory=list)
    context: Optional[str] = Field(default="")
    attachments: List[FileRef] = Field(default_factory=list)
    exclude: List[FileRef] = Field(default_factory=list)
    filter: Optional[SearchFilter] = Field(default=None)
    metadata: dict = Field(default_factory=dict)
    mode: Literal["auto", "search", "lookup", "chat"] = Field(default="auto")
