from src.core.application.usecase.llm import ModelService
from src.infrastructure.adapter.output.persistence.repository.mongo_llm_repository import (
    MongoModelRepository,
)
from src.infrastructure.adapter.output.llm_provider.crewai_provider import (
    CrewAILLMProvider,
)


def get_model_service() -> ModelService:
    """
    Dependency injection for ModelService.
    Creates and returns a ModelService instance with its dependencies.
    """
    model_repository = MongoModelRepository()
    llm_provider = CrewAILLMProvider()
    return ModelService(model_repository=model_repository, llm_provider=llm_provider)
