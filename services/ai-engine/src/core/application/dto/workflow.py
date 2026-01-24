from typing import List, Optional, Dict, Literal, Any
from pydantic import BaseModel, ConfigDict
from src.core.application.dto.completion import (
    BaseCompletionRequest,
    BaseCompletionResponse,
)


class CreateWorkflowRequest(BaseModel):
    name: str
    description: Optional[str] = None
    process: Literal["sequential", "hierarchical"] = "sequential"
    tasks: List[str] = []
    manager_agent_id: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Advanced Content Pipeline",
                "description": "Updated pipeline with editing step.",
                "process": "hierarchical",
                "tasks": ["job_research_id", "job_writing_id", "job_editing_id"],
                "manager_agent_id": "agent_manager_id",
            }
        }
    )


class UpdateWorkflowRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    process: Optional[Literal["sequential", "hierarchical"]] = None
    tasks: Optional[List[str]] = None
    manager_agent_id: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Advanced Content Pipeline",
                "description": "Updated pipeline with editing step.",
                "process": "hierarchical",
                "tasks": ["job_research_id", "job_writing_id", "job_editing_id"],
                "manager_agent_id": "agent_manager_id",
            }
        }
    )


class WorkflowCompletionRequest(BaseCompletionRequest):
    inputs: Dict[str, Any] = {}

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "inputs": {
                    "topic": "AI Agents",
                    "audience": "Developers",
                }
            }
        }
    )


class WorkflowCompletionResponse(BaseCompletionResponse):
    usage: Optional[Dict[str, int]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "result": "Final blog post content...",
                "usage": {
                    "total_tokens": 500,
                    "prompt_tokens": 200,
                    "completion_tokens": 300,
                    "successful_requests": 3,
                },
            }
        }
    )
