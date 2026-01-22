from abc import ABC, abstractmethod
from typing import List, Optional
from src.core.domain.model.workflow import Workflow


class WorkflowRepository(ABC):
    """
    Interface for Workflow persistence.
    """

    @abstractmethod
    async def get(self, workflow_id: str) -> Optional[Workflow]:
        """Get a workflow by ID."""
        pass

    @abstractmethod
    async def list(self) -> List[Workflow]:
        """List all workflows."""
        pass

    @abstractmethod
    async def create(self, workflow: Workflow) -> Workflow:
        """Create a new workflow."""
        pass

    @abstractmethod
    async def update(self, workflow: Workflow) -> Workflow:
        """Update an existing workflow."""
        pass

    @abstractmethod
    async def delete(self, workflow_id: str) -> bool:
        """Delete a workflow."""
        pass
