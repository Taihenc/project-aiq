from pydantic import BaseModel, Field
from typing import List, Optional


class AgentConfig(BaseModel):
    """Configuration for creating an agent"""

    name: str = Field(..., description="Unique name for this agent")
    role: str = Field(
        ..., description="Role of the agent (e.g., 'Researcher', 'Writer')"
    )
    goal: str = Field(..., description="Goal that the agent is trying to achieve")
    backstory: str = Field(
        ..., description="Backstory of the agent, helps with context"
    )
    model: str = Field(
        ..., description="Model name to use (will be fetched from model service)"
    )
    tools: Optional[List[str]] = Field(
        [],
        description="List of tool names to use (will be fetched from tool service)",
    )
    verbose: bool = Field(
        False,
        description="Enable verbose logging for this agent (default: False)",
    )
