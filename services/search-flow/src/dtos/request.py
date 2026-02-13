from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel
from src.models.search import (
    VectorSearchOutput,
    PageLookupOutput,
    ChunkLookupOutput,
    GraphSearchOutput,
)


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    context: List[
        Union[
            Dict[str, Any],
            VectorSearchOutput,
            PageLookupOutput,
            # ChunkLookupOutput,
            # GraphSearchOutput,
        ]
    ] = []
