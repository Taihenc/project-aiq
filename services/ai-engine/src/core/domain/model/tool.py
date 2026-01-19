from typing import List, Optional, Dict, Literal
from src.core.domain.model.base import Entity
from pydantic import BaseModel


class ExecutionConfig(BaseModel):
    url: str
    transport: Literal["sse", "http"] = "sse"
    headers: Optional[Dict[str, str]] = None


class Tool(Entity):
    name: str
    description: Optional[str] = None
    status: Literal["connected", "disconnected", "error"] = "disconnected"
    last_checked: Optional[str] = None  # ISO format
    execution_config: ExecutionConfig
    discovered_functions: List[str] = []
