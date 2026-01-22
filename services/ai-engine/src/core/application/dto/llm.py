from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from src.core.domain.value_object.llm import ModelConfig, Message
from src.core.application.dto.completion import (
    BaseCompletionRequest,
    BaseCompletionResponse,
)


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


class UpdateModelRequest(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    description: Optional[str] = None
    default_config: Optional[ModelConfig] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "gpt-4-turbo-updated",
                "provider": "openai",
                "description": "Updated description",
                "default_config": {
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


class CompletionRequest(BaseCompletionRequest):
    messages: List[Message] = []

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "Hello!"},
                ],
                "config": {
                    "temperature": 0.8,
                    "max_tokens": 8192,
                    "top_p": 1.0,
                    "frequency_penalty": 0.0,
                    "presence_penalty": 0.0,
                },
            }
        }
    )


class CompletionResponse(BaseCompletionResponse):
    content: str
