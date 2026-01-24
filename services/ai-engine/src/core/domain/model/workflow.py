from typing import List, Optional, Literal
from src.core.domain.model.base import Entity


class Workflow(Entity):
    name: str
    description: Optional[str] = None
    process: Literal["sequential", "hierarchical"] = "sequential"
    tasks: List[str] = []  # List of Job IDs
    manager_agent_id: Optional[str] = None
