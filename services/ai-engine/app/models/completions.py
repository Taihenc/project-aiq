from pydantic import BaseModel, Field
from typing import Any, List


class TaskOutputSummary(BaseModel):
    """Summary of a single task output"""

    name: str = Field(..., description="Task name")
    raw: Any = Field(..., description="Raw task output")


class TokenUsage(BaseModel):
    """Token usage statistics"""

    total_tokens: int = Field(default=0, description="Total tokens used")
    prompt_tokens: int = Field(default=0, description="Prompt tokens used")
    cached_prompt_tokens: int = Field(
        default=0, description="Cached prompt tokens used"
    )
    completion_tokens: int = Field(default=0, description="Completion tokens used")
    successful_requests: int = Field(
        default=0, description="Number of successful requests"
    )


class CompletionData(BaseModel):
    """Completion response data structure"""

    raw: Any = Field(..., description="Raw crew output (main response)")
    json_dict: dict[str, Any] | None = Field(
        default=None, description="JSON dictionary output from the crew"
    )
    token_usage: TokenUsage = Field(..., description="Token usage statistics")
    tasks_output: List[TaskOutputSummary] = Field(
        ..., description="Summary of task outputs with name and raw"
    )
