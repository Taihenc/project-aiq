from typing import List, Dict, Any, Union
from pydantic import BaseModel


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    context: List[Dict[str, Any]] = []
