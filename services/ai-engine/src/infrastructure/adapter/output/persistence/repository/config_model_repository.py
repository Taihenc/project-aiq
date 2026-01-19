from typing import List, Optional
from src.core.application.port.output.repository import ModelRepository
from src.core.domain.model.llm import Model
from src.infrastructure.config.settings import settings


class ConfigModelRepository(ModelRepository):
    """
    Read-only repository that loads models from configuration.
    Not connected to MongoDB.
    """

    def __init__(self):
        # Load models from settings to maintain single source of truth
        self._models = [Model(**m) for m in settings.mock_models]

    async def get(self, id: str) -> Optional[Model]:
        for model in self._models:
            if model.id == id:
                return model
        return None

    async def list(self, provider: Optional[str] = None) -> List[Model]:
        if provider:
            return [m for m in self._models if m.provider == provider]
        return self._models

    # Read-only: raise error or do nothing for write ops
    async def create(self, entity: Model) -> Model:
        raise NotImplementedError("ModelRepository is read-only")

    async def update(self, entity: Model) -> Model:
        raise NotImplementedError("ModelRepository is read-only")

    async def delete(self, id: str) -> bool:
        raise NotImplementedError("ModelRepository is read-only")
