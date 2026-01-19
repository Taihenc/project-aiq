from src.core.application.usecase.model_service import ModelService
from src.infrastructure.adapter.output.persistence.repository.config_model_repository import (
    ConfigModelRepository,
)


def get_model_service() -> ModelService:
    """
    Dependency injection for ModelService.
    Creates and returns a ModelService instance with its dependencies.
    """
    model_repository = ConfigModelRepository()
    return ModelService(model_repository)
