from typing import List
from datetime import datetime
from src.core.application.port.output.repository import JobRepository
from src.core.application.port.input.job_port import JobPort
from src.core.domain.model.job import Job
from src.core.application.dto.job import CreateJobRequest, UpdateJobRequest
from src.core.domain.exceptions import (
    EntityNotFoundException,
    DuplicateEntityException,
)


class JobService(JobPort):
    """
    Service for managing Jobs.
    """

    def __init__(self, job_repository: JobRepository):
        self.job_repository = job_repository

    async def list_jobs(self) -> List[Job]:
        """
        List all registered jobs.
        """
        return await self.job_repository.list()

    async def get_job(self, job_id: str) -> Job:
        """
        Get a specific job by ID.
        """
        job = await self.job_repository.get(job_id)
        if not job:
            raise EntityNotFoundException(f"Job not found: {job_id}")
        return job

    async def create_job(self, request: CreateJobRequest) -> Job:
        """
        Create a new job.
        """
        # Check for duplicates by name
        existing_jobs = await self.job_repository.list()
        for j in existing_jobs:
            if j.name == request.name:
                raise DuplicateEntityException(
                    f"Job with name '{request.name}' already exists"
                )

        # In a real implementation, we might want to validate that the agent exists here

        job = Job(**request.model_dump())
        return await self.job_repository.create(job)

    async def update_job(self, job_id: str, request: UpdateJobRequest) -> Job:
        """
        Update an existing job definition.
        """
        existing = await self.job_repository.get(job_id)
        if not existing:
            raise EntityNotFoundException(f"Job not found: {job_id}")

        # Check for duplicates if name is changing
        if request.name is not None and request.name != existing.name:
            existing_jobs = await self.job_repository.list()
            for j in existing_jobs:
                if j.name == request.name:
                    raise DuplicateEntityException(
                        f"Job with name '{request.name}' already exists"
                    )

        update_data = request.model_dump(exclude_unset=True)
        updated_job = existing.model_copy(update=update_data)
        updated_job.updated_at = datetime.utcnow()

        return await self.job_repository.update(updated_job)

    async def delete_job(self, job_id: str) -> bool:
        """
        Delete a job.
        """
        existing = await self.job_repository.get(job_id)
        if not existing:
            raise EntityNotFoundException(f"Job not found: {job_id}")
        return await self.job_repository.delete(job_id)
