from src.core.application.usecase.llm import ModelService
from src.core.application.usecase.tool_service import ToolService
from src.core.application.usecase.agent_service import AgentService
from src.core.application.usecase.job_service import JobService
from src.infrastructure.adapter.output.persistence.repository.mongo_llm_repository import (
    MongoModelRepository,
)
from src.infrastructure.adapter.output.persistence.repository.mongo_tool_repository import (
    MongoToolRepository,
)
from src.infrastructure.adapter.output.persistence.repository.mongo_agent_repository import (
    MongoAgentRepository,
)
from src.infrastructure.adapter.output.persistence.repository.mongo_job_repository import (
    MongoJobRepository,
)
from src.infrastructure.adapter.output.llm_provider.crewai_provider import (
    CrewAILLMProvider,
)
from src.infrastructure.adapter.output.job_executor.crewai_executor import (
    CrewAIJobExecutor,
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
    model_repository = MongoModelRepository()
    tool_repository = MongoToolRepository()

    return AgentService(
        agent_repository=agent_repository,
        model_repository=model_repository,
        tool_repository=tool_repository,
    )


def get_job_service() -> JobService:
    """
    Dependency injection for JobService.
    """
    job_repository = MongoJobRepository()
    agent_repository = MongoAgentRepository()
    model_repository = MongoModelRepository()
    tool_repository = MongoToolRepository()

    llm_provider = CrewAILLMProvider()
    job_executor = CrewAIJobExecutor(llm_provider=llm_provider)

    return JobService(
        job_repository=job_repository,
        agent_repository=agent_repository,
        model_repository=model_repository,
        tool_repository=tool_repository,
        job_executor=job_executor,
    )
