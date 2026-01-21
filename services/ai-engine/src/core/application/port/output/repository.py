from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional, Any
from src.core.domain.model.base import Entity
from src.core.domain.model.llm import Model
from src.core.domain.model.tool import Tool
from src.core.domain.model.agent import Agent
from src.core.domain.model.job import Job
from src.core.domain.model.workflow import Workflow
from src.core.domain.model.execution import Execution

T = TypeVar("T", bound=Entity)


class Repository(ABC, Generic[T]):
    @abstractmethod
    async def get(self, id: str) -> Optional[T]:
        pass

    @abstractmethod
    async def list(self) -> List[T]:
        pass

    @abstractmethod
    async def create(self, entity: T) -> T:
        pass

    @abstractmethod
    async def update(self, entity: T) -> T:
        pass

    @abstractmethod
    async def delete(self, id: str) -> bool:
        pass


class ModelRepository(Repository[Model]):
    @abstractmethod
    async def list(self, provider: Optional[str] = None) -> List[Model]:
        pass


class ToolRepository(Repository[Tool]):
    pass


class AgentRepository(Repository[Agent]):
    pass


class JobRepository(Repository[Job]):
    pass


class WorkflowRepository(Repository[Workflow]):
    pass


class ExecutionRepository(Repository[Execution]):
    pass
