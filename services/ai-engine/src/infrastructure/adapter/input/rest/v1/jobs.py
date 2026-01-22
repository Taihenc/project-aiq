from fastapi import APIRouter, status, Depends
from typing import List
from src.core.domain.model.job import Job
from src.core.application.usecase.job_service import JobService
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse
from src.infrastructure.config.dependencies import get_job_service
from src.core.application.dto.job import CreateJobRequest, UpdateJobRequest
from src.infrastructure.adapter.input.rest.v1.examples.job_examples import (
    LIST_JOBS_RESPONSES,
    GET_JOB_RESPONSES,
    CREATE_JOB_RESPONSES,
    UPDATE_JOB_RESPONSES,
    DELETE_JOB_RESPONSES,
)

router = APIRouter()


@router.get(
    "",
    response_model=BaseResponse[List[Job]],
    responses=LIST_JOBS_RESPONSES,
)
async def list_jobs(
    service: JobService = Depends(get_job_service),
):
    """List all registered jobs."""
    jobs = await service.list_jobs()
    return BaseResponse(data=jobs, message="Jobs retrieved successfully")


@router.get(
    "/{job_id}",
    response_model=BaseResponse[Job],
    responses=GET_JOB_RESPONSES,
)
async def get_job(
    job_id: str,
    service: JobService = Depends(get_job_service),
):
    """Get a specific job by ID."""
    job = await service.get_job(job_id)
    return BaseResponse(data=job, message="Job retrieved successfully")


@router.post(
    "",
    response_model=BaseResponse[Job],
    responses=CREATE_JOB_RESPONSES,
    status_code=status.HTTP_201_CREATED,
)
async def create_job(
    request: CreateJobRequest,
    service: JobService = Depends(get_job_service),
):
    """Create a new job."""
    created_job = await service.create_job(request)
    return BaseResponse(data=created_job, message="Job created successfully")


@router.put(
    "/{job_id}",
    response_model=BaseResponse[Job],
    responses=UPDATE_JOB_RESPONSES,
)
async def update_job(
    job_id: str,
    request: UpdateJobRequest,
    service: JobService = Depends(get_job_service),
):
    """Update an existing job definition."""
    updated_job = await service.update_job(job_id, request)
    return BaseResponse(data=updated_job, message="Job updated successfully")


@router.delete(
    "/{job_id}",
    response_model=BaseResponse[bool],
    responses=DELETE_JOB_RESPONSES,
)
async def delete_job(
    job_id: str,
    service: JobService = Depends(get_job_service),
):
    """Delete a job."""
    result = await service.delete_job(job_id)
    return BaseResponse(data=result, message="Job deleted successfully")
