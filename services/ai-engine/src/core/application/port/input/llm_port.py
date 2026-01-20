from abc import ABC, abstractmethod
from typing import List, Optional
from src.core.domain.model.llm import Model
from src.core.application.dto.llm import CreateModelRequest, UpdateModelRequest


class ModelPort(ABC):
    @abstractmethod
    async def create_model(self, request: CreateModelRequest) -> Model:
        pass

    @abstractmethod
    async def get_model(self, model_id: str) -> Model:
        pass

    @abstractmethod
    async def update_model(self, model_id: str, request: UpdateModelRequest) -> Model:
        pass

    @abstractmethod
    async def delete_model(self, model_id: str) -> bool:
        pass

    @abstractmethod
    async def list_models(self, provider: Optional[str] = None) -> List[Model]:
        pass
