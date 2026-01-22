from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CreateAgentRequest(BaseModel):
    name: str
    role: str
    goal: str
    backstory: str
    model_id: str
    tools: List[str] = []

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "research_agent",
                "role": "Senior Researcher",
                "goal": "Uncover groundbreaking concepts in AI",
                "backstory": "A seasoned researcher with a passion for technology.",
                "model_id": "model_01",
                "tools": ["tool_01"],
            }
        }
    )


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    backstory: Optional[str] = None
    model_id: Optional[str] = None
    tools: Optional[List[str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "role": "Principal Researcher",
                "goal": "Lead the research team to success",
            }
        }
    )
