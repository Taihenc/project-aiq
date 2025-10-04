from pydantic import BaseModel
from typing import Optional, List

from app.config import settings


class ChatBox(BaseModel):
    """Chat box model for chat endpoint"""

    message: str
    context: Optional[dict] = None


class ChatTurn(BaseModel):
    """Chat turn model for chat endpoint"""

    chat_id: str
    request: ChatBox
    response: ChatBox
    timestamp: str


class ChatSession(BaseModel):
    """Chat history model for chat endpoint"""

    session_id: str
    history: List[ChatTurn]


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""

    chat_box: ChatBox
    session_id: Optional[str] = None

    # Provider and Model
    provider: str
    model: str

    # AI Model Parameters
    temperature: Optional[float] = settings.DEFAULT_TEMPERATURE
    top_k: Optional[int] = settings.DEFAULT_TOP_K
    top_p: Optional[float] = settings.DEFAULT_TOP_P
    max_tokens: Optional[int] = settings.DEFAULT_MAX_TOKENS
    frequency_penalty: Optional[float] = settings.DEFAULT_FREQUENCY_PENALTY
    presence_penalty: Optional[float] = settings.DEFAULT_PRESENCE_PENALTY

    # Additional Settings
    stream: Optional[bool] = settings.DEFAULT_STREAM
    stop_sequences: Optional[List[str]] = settings.DEFAULT_STOP_SEQUENCES
    seed: Optional[int] = settings.DEFAULT_SEED


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""

    chat_box: ChatBox

    # Response metadata
    model_used: str
    timestamp: str
    processing_time_ms: int

    # Token usage information
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    # Session information
    session_id: str
    chat_id: str
