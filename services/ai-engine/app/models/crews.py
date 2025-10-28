from crewai import Process
from pydantic import BaseModel, Field
from typing import List, Optional


class TaskConfig(BaseModel):
    """Configuration for a single task from task.json"""

    name: str = Field(..., description="Task name")
    description: str = Field(..., description="Task description")
    expected_output: str = Field(..., description="Expected output")
    agent: str = Field(..., description="Agent name")
    output_json: str = Field(..., description="Output JSON")
    context: List[str] = Field([], description="Context")


class CrewConfig(BaseModel):
    """Configuration for a crew from crews.json"""

    name: str = Field(..., description="Crew name")
    description: str = Field(..., description="Crew description")
    process: Process = Field(Process.sequential, description="Process type")
    verbose: bool = Field(False, description="Enable verbose logging")
    workflow: List[TaskConfig] = Field(..., description="Workflow steps")
