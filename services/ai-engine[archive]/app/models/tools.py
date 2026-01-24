from pydantic import BaseModel


class ToolConfig(BaseModel):
    """Configuration for a tool."""

    name: str
    description: str
