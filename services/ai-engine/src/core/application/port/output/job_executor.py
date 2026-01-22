from abc import ABC, abstractmethod
from typing import Any, Dict, List
from src.core.domain.model.job import Job
from src.core.domain.model.agent import Agent
from src.core.domain.model.llm import Model
from src.core.domain.model.tool import Tool


class JobExecutorPort(ABC):
    """
    Output port for Job execution (Agentic Workflow).
    """

    @abstractmethod
    async def execute_job(
        self,
        job: Job,
        agent: Agent,
        model: Model,
        tools: List[Tool],
        input_variables: Dict[str, Any],
    ) -> Any:
        """
        Execute a job using the specified agent and tools.
        """
        pass
