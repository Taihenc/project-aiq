from typing import List, Dict, Any, Union
from pydantic import BaseModel
from src.models.search import (
    ChunkContent,
    PageContent,
    SearchContent,
)


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    context: List[Union[ChunkContent, PageContent, SearchContent]] = []
