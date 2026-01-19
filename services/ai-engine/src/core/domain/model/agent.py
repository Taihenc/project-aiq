from typing import List, Optional, Dict, Any
from src.core.domain.model.base import Entity
from src.core.domain.value_object.config import ModelConfig


class Agent(Entity):
    name: str
    role: str
    goal: Optional[str] = None
    backstory: Optional[str] = None
    model_id: str
    tools: List[str] = []
    default_config: Optional[ModelConfig] = None
