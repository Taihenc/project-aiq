from typing import Any
from pydantic import BaseModel, Field
from app.config.settings import settings


class Response(BaseModel):
    success: bool = Field(..., description="Success flag")
    message: str = Field(..., description="Message")
    data: Any = Field(..., description="Data")
