from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.core.application.dto.completion import (
    BaseCompletionRequest,
    BaseCompletionResponse,
)


class CreateJobRequest(BaseModel):
    name: str
    agent_id: str
    task_description: str
    expected_output: str
    context: Optional[List[str]] = None
    output_pydantic: Optional[Dict[str, str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Market Research Task",
                "agent_id": "agent_id_1",
                "task_description": "Analyze the latest trends in renewable energy for 2024.",
                "expected_output": "A detailed report on top 5 renewable energy technologies.",
                "context": ["previous_job_id_1"],
                "output_pydantic": {
                    "report_title": "str",
                    "technologies": "list[str]",
                    "summary": "str",
                },
            }
        }
    )


class UpdateJobRequest(BaseModel):
    name: Optional[str] = None
    agent_id: Optional[str] = None
    task_description: Optional[str] = None
    expected_output: Optional[str] = None
    context: Optional[List[str]] = None
    output_pydantic: Optional[Dict[str, str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Market Research Task",
                "agent_id": "agent_id_1",
                "task_description": "Analyze the latest trends in renewable energy for 2024.",
                "expected_output": "An updated report with market size estimations.",
                "context": ["previous_job_id_1"],
                "output_pydantic": {
                    "report_title": "str",
                    "technologies": "list[str]",
                    "summary": "str",
                },
            }
        }
    )


class JobCompletionRequest(BaseCompletionRequest):
    """Request for job completion."""

    inputs: Dict[str, Any] = {}

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "config": {
                    "temperature": 0.7,
                    "max_tokens": 1000,
                    "top_p": 0.9,
                    "frequency_penalty": 0.1,
                    "presence_penalty": 0.1,
                },
                "inputs": {
                    "topic": "Renewable Energy",
                    "year": "2024",
                },
            }
        }
    )


class JobCompletionResponse(BaseCompletionResponse):
    """Response for job completion."""

    usage: Optional[Dict[str, int]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "result": {
                    "report_title": "2024 Renewable Energy Trends",
                    "technologies": ["Solar", "Wind", "Green Hydrogen"],
                    "summary": "The market is shifting towards hybrid systems.",
                },
                "usage": {
                    "prompt_tokens": 100,
                    "completion_tokens": 50,
                    "total_tokens": 150,
                },
            }
        }
    )
