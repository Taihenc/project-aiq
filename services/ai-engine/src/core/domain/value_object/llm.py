from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from src.infrastructure.config.settings import settings


class ModelConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    temperature: Optional[float] = Field(default=settings.llm_temperature)
    max_tokens: Optional[int] = Field(default=settings.llm_max_tokens)
    top_p: Optional[float] = Field(default=settings.llm_top_p)
    frequency_penalty: Optional[float] = Field(default=settings.llm_frequency_penalty)
    presence_penalty: Optional[float] = Field(default=settings.llm_presence_penalty)


class Message(BaseModel):
    model_config = ConfigDict(frozen=True)

    role: str
    content: str
