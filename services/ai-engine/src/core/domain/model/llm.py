from typing import Optional
from src.core.domain.model.base import Entity
from src.core.domain.value_object.config import ModelConfig


class Model(Entity):
    name: str
    provider: str
    description: Optional[str] = None
    context_window: int = 128000
    default_config: ModelConfig
    is_active: bool = True
