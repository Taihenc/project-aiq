from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CreateJobRequest(BaseModel):
    name: str
    agent: str
    task_description: str
    expected_output: str
    context: Optional[List[str]] = None
    output_pydantic: Optional[Dict[str, str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Market Research Task",
                "agent": "researcher_agent",
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
    agent: Optional[str] = None
    task_description: Optional[str] = None
    expected_output: Optional[str] = None
    context: Optional[List[str]] = None
    output_pydantic: Optional[Dict[str, str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Market Research Task",
                "agent": "researcher_agent",
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
