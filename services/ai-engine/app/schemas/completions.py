from typing import List, Optional
from pydantic import BaseModel, Field
from app.config.settings import settings
from app.schemas.base import BaseModelSettings


class CrewRequest(BaseModelSettings):
    inputs: dict = Field(..., description="Input data for the crew")


class ModelRequest(BaseModelSettings):
    prompt: str = Field(..., description="The prompt text")
    model: str = Field(default=settings.DEFAULT_MODEL, description="The model to use")


class AgentRequest(BaseModelSettings):
    prompt: str = Field(..., description="The prompt for the agent")
