from typing import Any, Dict, Optional, List
from pydantic import BaseModel, ConfigDict


from src.core.domain.value_object.llm import ModelConfig


class BaseCompletionRequest(BaseModel):
    """
    Base request for completion tasks.
    """

    config: Optional[ModelConfig] = None


class BaseCompletionResponse(BaseModel):
    """
    Base response for completions.
    """

    result: Any
