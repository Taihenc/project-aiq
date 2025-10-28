from pydantic import BaseModel, Field


class Message(BaseModel):
    """Message model for chat completion requests"""

    role: str = Field(
        ..., description="Role of the message sender (user, assistant, system)"
    )
    content: str = Field(..., description="Content of the message")
