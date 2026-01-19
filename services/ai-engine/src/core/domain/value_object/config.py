from pydantic import BaseModel
from src.infrastructure.config.settings import settings


class ModelConfig(BaseModel):
    temperature: float = settings.agent_temperature
    max_tokens: int = settings.agent_max_tokens
