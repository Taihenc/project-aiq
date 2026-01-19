from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Literal
from src.core.domain.model.job import Job


class JobPort(ABC):
    """
    Input port for Job operations.
    Defines the interface between REST API and application layer for job management.
    """

    @abstractmethod
    async def create_job(
        self,
        name: str,
        agent_id: str,
        task_description: str,
        expected_output_instruction: str,
        output_type: Literal["structured", "text"] = "text",
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> Job:
        """Create a new job definition."""
        pass

    @abstractmethod
    async def get_job(self, job_id: str) -> Job:
        """Retrieve a job by ID."""
        pass

    @abstractmethod
    async def list_jobs(self) -> List[Job]:
        """List all job definitions."""
        pass

    @abstractmethod
    async def update_job(
        self,
        job_id: str,
        name: Optional[str] = None,
        agent_id: Optional[str] = None,
        task_description: Optional[str] = None,
        expected_output_instruction: Optional[str] = None,
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> Job:
        """Update an existing job definition."""
        pass

    @abstractmethod
    async def delete_job(self, job_id: str) -> bool:
        """Delete a job by ID. Returns True if successful."""
        pass
