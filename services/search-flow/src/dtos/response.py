from typing import Generic, TypeVar, Optional
from pydantic import BaseModel


T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    status_code: int = 200
    message: str = "success"
    data: Optional[T] = None
