from fastapi import APIRouter, HTTPException, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from src.core.domain.model.workflow import Workflow, WorkflowStep
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse

router = APIRouter()


# Using BaseResponse[List[Workflow]] directly in the router instead of WorkflowListResponse


class CreateWorkflowRequest(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[WorkflowStep]


@router.get("", response_model=BaseResponse[List[Workflow]])
async def list_workflows():
    return BaseResponse(data=[])


@router.post(
    "", response_model=BaseResponse[Workflow], status_code=status.HTTP_201_CREATED
)
async def create_workflow(payload: CreateWorkflowRequest):
    workflow = Workflow(
        id="wf_01",
        name=payload.name,
        description=payload.description,
        steps=payload.steps,
    )
    return BaseResponse(data=workflow)


@router.get("/{workflow_id}", response_model=BaseResponse[Workflow])
async def get_workflow(workflow_id: str):
    raise HTTPException(status_code=404, detail="Workflow not found")


@router.put("/{workflow_id}", response_model=BaseResponse[Workflow])
async def update_workflow(workflow_id: str, payload: CreateWorkflowRequest):
    raise HTTPException(status_code=404, detail="Workflow not found")


@router.delete("/{workflow_id}", response_model=BaseResponse[None])
async def delete_workflow(workflow_id: str):
    raise HTTPException(status_code=404, detail="Workflow not found")
