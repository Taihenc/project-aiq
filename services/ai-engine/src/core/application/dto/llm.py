from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from src.core.domain.value_object.llm import ModelConfig


class CreateModelRequest(BaseModel):
    name: str
    provider: str
    description: Optional[str] = None
    default_config: Optional[ModelConfig] = None
    is_active: bool = True

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "gpt-4-turbo",
                "provider": "openai",
                "description": "Powerful model for complex tasks",
                "default_config": {
                    "context_window": 128000,
                    "temperature": 0.7,
                    "max_tokens": 4096,
                    "top_p": 1.0,
                    "frequency_penalty": 0.0,
                    "presence_penalty": 0.0,
                },
                "is_active": True,
            }
        }
    )


class UpdateModelConfig(BaseModel):
    context_window: Optional[int] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None


class UpdateModelRequest(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    description: Optional[str] = None
    default_config: Optional[UpdateModelConfig] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "gpt-4-turbo-updated",
                "provider": "openai",
                "description": "Updated description",
                "default_config": {
                    "context_window": 128000,
                    "temperature": 0.8,
                    "max_tokens": 8192,
                    "top_p": 1.0,
                    "frequency_penalty": 0.0,
                    "presence_penalty": 0.0,
                },
                "is_active": False,
            }
        }
    )
