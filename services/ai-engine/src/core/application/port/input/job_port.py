from abc import ABC, abstractmethod
from typing import List
from src.core.domain.model.job import Job
from src.core.application.dto.job import CreateJobRequest, UpdateJobRequest


class JobPort(ABC):
    """
    Input port for Job operations.
    Defines the interface between REST API and application layer for job management.
    """

    @abstractmethod
    async def create_job(self, request: CreateJobRequest) -> Job:
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
        request: UpdateJobRequest,
    ) -> Job:
        """Update an existing job definition."""
        pass

    @abstractmethod
    async def delete_job(self, job_id: str) -> bool:
        """Delete a job by ID. Returns True if successful."""
        pass
