from typing import List, Optional, Dict
from src.core.domain.model.base import Entity
from pydantic import BaseModel


class WorkflowStep(BaseModel):
    step_id: str
    job_id: str
    dependencies: List[str] = []
    input_mapping: Dict[str, str] = {}


class Workflow(Entity):
    name: str
    description: Optional[str] = None
    steps: List[WorkflowStep] = []
