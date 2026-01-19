from typing import Optional, Dict, Any, Literal
from src.core.domain.model.base import Entity
from pydantic import BaseModel, Field


class ExecutionResult(BaseModel):
    step_results: Dict[str, Any] = {}


class Execution(Entity):
    workflow_id: str
    status: Literal["pending", "running", "completed", "failed"] = "pending"
    current_step: Optional[str] = None
    results: Dict[str, Any] = {}
    error: Optional[str] = None
    completed_at: Optional[str] = None

    # Input store
    inputs: Dict[str, Any] = {}
    webhook_url: Optional[str] = None
