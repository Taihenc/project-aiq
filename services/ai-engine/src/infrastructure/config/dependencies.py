from src.core.application.usecase.llm import ModelService
from src.core.application.usecase.tool_service import ToolService
from src.core.application.usecase.agent_service import AgentService
from src.infrastructure.adapter.output.persistence.repository.mongo_llm_repository import (
    MongoModelRepository,
)
from src.infrastructure.adapter.output.persistence.repository.mongo_tool_repository import (
    MongoToolRepository,
)
from src.infrastructure.adapter.output.persistence.repository.mongo_agent_repository import (
    MongoAgentRepository,
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


def get_tool_service() -> ToolService:
    """
    Dependency injection for ToolService.
    """
    tool_repository = MongoToolRepository()
    return ToolService(tool_repository=tool_repository)


def get_agent_service() -> AgentService:
    """
    Dependency injection for AgentService.
    """
    agent_repository = MongoAgentRepository()
    return AgentService(agent_repository=agent_repository)
