from fastapi import APIRouter, HTTPException, status
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel
from src.core.domain.model.job import Job
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse

router = APIRouter()


class CreateJobRequest(BaseModel):
    name: str
    agent_id: str
    task_description: str
    expected_output_instruction: str
    output_schema: Optional[Dict[str, Any]] = None


class UpdateJobRequest(BaseModel):
    name: Optional[str] = None
    agent_id: Optional[str] = None
    task_description: Optional[str] = None
    expected_output_instruction: Optional[str] = None
    output_schema: Optional[Dict[str, Any]] = None


class CreateJobResponse(BaseModel):
    id: str
    message: str


@router.get("", response_model=BaseResponse[List[Job]])
async def list_jobs():
    return BaseResponse(data=[])


@router.post(
    "",
    response_model=BaseResponse[CreateJobResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_job(payload: CreateJobRequest):
    data = CreateJobResponse(
        id="job_01", message="Job definition created successfully."
    )
    return BaseResponse(data=data)


@router.get("/{job_id}", response_model=BaseResponse[Job])
async def get_job(job_id: str):
    raise HTTPException(status_code=404, detail="Job not found")


@router.put("/{job_id}", response_model=BaseResponse[Job])
async def update_job(job_id: str, payload: UpdateJobRequest):
    raise HTTPException(status_code=404, detail="Job not found")


@router.delete("/{job_id}", response_model=BaseResponse[None])
async def delete_job(job_id: str):
    raise HTTPException(status_code=404, detail="Job not found")
