from src.core.application.usecase.llm import ModelService
from src.infrastructure.adapter.output.persistence.repository.mongo_llm_repository import (
    MongoModelRepository,
)


def get_model_service() -> ModelService:
    """
    Dependency injection for ModelService.
    Creates and returns a ModelService instance with its dependencies.
    """
    model_repository = MongoModelRepository()
    return ModelService(model_repository)
