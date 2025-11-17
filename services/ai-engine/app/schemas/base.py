from typing import Any
from pydantic import BaseModel, Field
from app.config.settings import settings


class BaseResponse(BaseModel):
    success: bool = Field(..., description="Success flag")
    message: str = Field(..., description="Message")
    data: Any = Field(..., description="Data")


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
