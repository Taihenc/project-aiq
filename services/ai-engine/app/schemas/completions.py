from typing import List, Optional
from pydantic import BaseModel, Field
from app.config.settings import settings


class BaseModelSettings(BaseModel):

    temperature: float = Field(
        default=settings.TEMPERATURE, description="Controls randomness in the output"
    )
    max_tokens: int = Field(
        default=settings.MAX_TOKENS, description="Maximum number of tokens to generate"
    )
    stream: bool = Field(
        default=settings.DEFAULT_STREAM, description="Whether to stream the response"
    )
    frequency_penalty: float = Field(
        default=settings.FREQUENCY_PENALTY, description="Penalty for frequent tokens"
    )
    presence_penalty: float = Field(
        default=settings.PRESENCE_PENALTY, description="Penalty for present tokens"
    )
    top_p: float = Field(default=settings.TOP_P, description="Top-p sampling parameter")


class CrewRequest(BaseModelSettings):
    inputs: dict = Field(..., description="Input data for the crew")


class ModelRequest(BaseModelSettings):
    prompt: str = Field(..., description="The prompt text")
    model: str = Field(default=settings.DEFAULT_MODEL, description="The model to use")


class AgentRequest(BaseModelSettings):
    prompt: str = Field(..., description="The prompt for the agent")
