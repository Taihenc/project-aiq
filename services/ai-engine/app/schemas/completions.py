from typing import List
from pydantic import BaseModel, Field
from app.models.completions import Message


class CompletionRequest(BaseModel):
    """Request model for chat completion"""

    messages: List[Message] = Field(
        ..., description="List of messages in the conversation", min_items=1
    )


class CompletionResponse(BaseModel):
    """Response model for chat completion"""

    message: str = Field(..., description="AI-generated response message")
