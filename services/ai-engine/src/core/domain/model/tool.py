from typing import List, Optional, Dict, Literal, Any
from src.core.domain.model.base import Entity
from pydantic import BaseModel


class Tool(Entity):
    name: str
    description: str
    type: Literal["REST", "MCP_SSE"]
    endpoint: str
    auth_config: Dict[str, Any]
    # if type is REST
    parameters: Optional[Dict[str, Literal["INTEGER", "STRING", "BOOLEAN"]]]
