from typing import Any
from pydantic import BaseModel, Field


class BaseResponse(BaseModel):
    success: bool = Field(..., description="Success flag")
    message: str = Field(..., description="Message")
    data: Any = Field(..., description="Data")
