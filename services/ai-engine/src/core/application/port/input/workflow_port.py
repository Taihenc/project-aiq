from abc import ABC, abstractmethod
from typing import List, Optional
from src.core.domain.model.workflow import Workflow, WorkflowStep


class WorkflowPort(ABC):
    """
    Input port for Workflow operations.
    Defines the interface between REST API and application layer for workflow management.
    """

    @abstractmethod
    async def create_workflow(
        self,
        name: str,
        steps: List[WorkflowStep],
        description: Optional[str] = None,
    ) -> Workflow:
        """Create a new workflow definition with job steps."""
        pass

    @abstractmethod
    async def get_workflow(self, workflow_id: str) -> Workflow:
        """Retrieve a workflow by ID."""
        pass

    @abstractmethod
    async def list_workflows(self) -> List[Workflow]:
        """List all workflow definitions."""
        pass

    @abstractmethod
    async def update_workflow(
        self,
        workflow_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        steps: Optional[List[WorkflowStep]] = None,
    ) -> Workflow:
        """Update an existing workflow definition."""
        pass

    @abstractmethod
    async def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow by ID. Returns True if successful."""
        pass
