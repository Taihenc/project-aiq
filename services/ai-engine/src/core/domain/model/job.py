from typing import Optional, Dict, Any, Literal
from src.core.domain.model.base import Entity


class Job(Entity):
    name: str
    agent_id: str
    task_description: str
    expected_output_instruction: str
    output_type: Literal["structured", "text"] = "text"
    output_schema: Optional[Dict[str, Any]] = None
