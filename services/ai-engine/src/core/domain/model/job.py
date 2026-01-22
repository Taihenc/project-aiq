from typing import Tuple
from typing import Optional, List, Dict
from src.core.domain.model.base import Entity


class Job(Entity):
    name: str
    agent: str
    task_description: str
    expected_output: str
    context: Optional[List["Job"]] = None
    output_pydantic: Optional[Dict[str, str]] = None
