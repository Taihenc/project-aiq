from abc import ABC, abstractmethod
from typing import Any, Dict, List
from src.core.domain.model.job import Job
from src.core.domain.model.agent import Agent
from src.core.domain.model.llm import Model
from src.core.domain.model.tool import Tool
from src.core.domain.model.workflow import Workflow
from typing import Optional


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

    @abstractmethod
    async def execute_workflow(
        self,
        workflow: Workflow,
        jobs: List[Job],
        agents: Dict[str, Agent],
        models: Dict[str, Model],
        tools: Dict[str, Tool],
        input_variables: Dict[str, Any],
        manager_agent: Optional[Agent] = None,
        manager_model: Optional[Model] = None,
    ) -> Any:
        """
        Execute a workflow (multiple jobs) using CrewAI.
        """
        pass

    @abstractmethod
    def execute_workflow_stream(
        self,
        workflow: Workflow,
        jobs: List[Job],
        agents: Dict[str, Agent],
        models: Dict[str, Model],
        tools: Dict[str, Tool],
        input_variables: Dict[str, Any],
        manager_agent: Optional[Agent] = None,
        manager_model: Optional[Model] = None,
    ) -> Any:
        """
        Execute a workflow and return an async generator for streaming updates.
        """
        pass
