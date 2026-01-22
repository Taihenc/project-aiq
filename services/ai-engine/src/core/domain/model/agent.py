from typing import List
from src.core.domain.model.base import Entity


class Agent(Entity):
    name: str
    role: str
    goal: str
    backstory: str
    model_id: str
    tools: List[str] = []
