from typing import List, Dict, Optional
from pydantic import BaseModel


class SearchChatRequest(BaseModel):
    query: str
    history: List[str] = []
    context: List[Dict] = []
