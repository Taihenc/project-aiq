from pydantic import BaseModel
from src.infrastructure.config.settings import settings


class ModelConfig(BaseModel):
    temperature: float = settings.llm_temperature
    max_tokens: int = settings.llm_max_tokens
