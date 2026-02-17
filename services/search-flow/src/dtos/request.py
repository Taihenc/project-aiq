from typing import List, Dict, Any, Union, Annotated
from pydantic import BaseModel, Field
from src.models.search import (
    ChunkRef,
    PageRef,
    SearchRef,
)


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    attachments: List[
        Annotated[Union[ChunkRef, PageRef, SearchRef], Field(discriminator="type")]
    ] = Field(default=[])
