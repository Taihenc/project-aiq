from fastapi import APIRouter, status, Depends
from typing import List
from src.core.domain.model.workflow import Workflow
from src.core.application.usecase.workflow_service import WorkflowService
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse
from src.infrastructure.config.dependencies import get_workflow_service
from src.core.application.dto.workflow import (
    CreateWorkflowRequest,
    UpdateWorkflowRequest,
    WorkflowCompletionRequest,
    WorkflowCompletionResponse,
)
from src.infrastructure.adapter.input.rest.v1.examples.workflow_examples import (
    LIST_WORKFLOWS_RESPONSES,
    GET_WORKFLOW_RESPONSES,
    CREATE_WORKFLOW_RESPONSES,
    UPDATE_WORKFLOW_RESPONSES,
    DELETE_WORKFLOW_RESPONSES,
    EXECUTE_WORKFLOW_RESPONSES,
)

router = APIRouter()


@router.get(
    "",
    response_model=BaseResponse[List[Workflow]],
    responses=LIST_WORKFLOWS_RESPONSES,
)
async def list_workflows(
    service: WorkflowService = Depends(get_workflow_service),
):
    """List all registered workflows."""
    workflows = await service.list_workflows()
    return BaseResponse(data=workflows, message="Workflows retrieved successfully")


@router.get(
    "/{workflow_id}",
    response_model=BaseResponse[Workflow],
    responses=GET_WORKFLOW_RESPONSES,
)
async def get_workflow(
    workflow_id: str,
    service: WorkflowService = Depends(get_workflow_service),
):
    """Get a specific workflow by ID."""
    workflow = await service.get_workflow(workflow_id)
    return BaseResponse(data=workflow, message="Workflow retrieved successfully")


@router.post(
    "",
    response_model=BaseResponse[Workflow],
    responses=CREATE_WORKFLOW_RESPONSES,
    status_code=status.HTTP_201_CREATED,
)
async def create_workflow(
    request: CreateWorkflowRequest,
    service: WorkflowService = Depends(get_workflow_service),
):
    """Create a new workflow."""
    created_workflow = await service.create_workflow(request)
    return BaseResponse(data=created_workflow, message="Workflow created successfully")


@router.put(
    "/{workflow_id}",
    response_model=BaseResponse[Workflow],
    responses=UPDATE_WORKFLOW_RESPONSES,
)
async def update_workflow(
    workflow_id: str,
    request: UpdateWorkflowRequest,
    service: WorkflowService = Depends(get_workflow_service),
):
    """Update an existing workflow."""
    updated_workflow = await service.update_workflow(workflow_id, request)
    return BaseResponse(data=updated_workflow, message="Workflow updated successfully")


@router.delete(
    "/{workflow_id}",
    response_model=BaseResponse[bool],
    responses=DELETE_WORKFLOW_RESPONSES,
)
async def delete_workflow(
    workflow_id: str,
    service: WorkflowService = Depends(get_workflow_service),
):
    """Delete a workflow."""
    result = await service.delete_workflow(workflow_id)
    return BaseResponse(data=result, message="Workflow deleted successfully")


@router.post(
    "/{workflow_id}/completion",
    response_model=BaseResponse[WorkflowCompletionResponse],
    responses=EXECUTE_WORKFLOW_RESPONSES,
)
async def execute_workflow(
    workflow_id: str,
    request: WorkflowCompletionRequest,
    service: WorkflowService = Depends(get_workflow_service),
):
    """Execute a workflow completion using CrewAI."""
    result = await service.execute_workflow(workflow_id, request)
    return BaseResponse(data=result, message="Workflow executed successfully")


@router.post("/{workflow_id}/completion/stream")
async def execute_workflow_stream(
    workflow_id: str,
    request: WorkflowCompletionRequest,
    service: WorkflowService = Depends(get_workflow_service),
):
    """Execute a workflow completion with streaming updates."""
    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        service.execute_workflow_stream(workflow_id, request),
        media_type="text/event-stream",
    )
