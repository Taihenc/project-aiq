from typing import List, Dict, Any, Union, Annotated
from pydantic import BaseModel, Field
from src.models.search import (
    ChunkContent,
    PageContent,
    SearchContent,
)


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    context: List[
        Annotated[
            Union[ChunkContent, PageContent, SearchContent], Field(discriminator="type")
        ]
    ] = Field(default=[])
