from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from src.core.domain.model.execution import Execution


class ExecutionPort(ABC):
    """
    Input port for Execution operations.
    Defines the interface between REST API and application layer for workflow execution.
    """

    @abstractmethod
    async def run_workflow(
        self,
        workflow_id: str,
        inputs: Dict[str, Any],
        webhook_url: Optional[str] = None,
    ) -> Execution:
        """
        Start a workflow execution with the given inputs.
        Returns execution record with status 'pending'.
        Actual execution happens asynchronously via message queue.
        """
        pass

    @abstractmethod
    async def get_execution(self, execution_id: str) -> Execution:
        """
        Retrieve execution status and results by ID.
        Returns current status, completed steps, and any errors.
        """
        pass
