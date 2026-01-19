from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from src.core.domain.model.execution import Execution
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse

router = APIRouter()


class RunWorkflowRequest(BaseModel):
    inputs: Dict[str, Any]
    webhook_url: Optional[str] = None


class RunWorkflowResponse(BaseModel):
    execution_id: str
    status: str
    message: str


@router.post(
    "/{workflow_id}/executions",
    response_model=BaseResponse[RunWorkflowResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def run_workflow(
    workflow_id: str, payload: RunWorkflowRequest, background_tasks: BackgroundTasks
):
    # In real impl, we would push to Redis here
    data = RunWorkflowResponse(
        execution_id="exec_12345",
        status="pending",
        message="Workflow execution started.",
    )
    return BaseResponse(data=data)


@router.get("/{execution_id}", response_model=BaseResponse[Execution])
async def get_execution_status(execution_id: str):
    # Mock data
    if execution_id == "exec_12345":
        execution = Execution(
            id=execution_id,
            workflow_id="wf_01",
            status="completed",
            results={"step_1": "done"},
        )
        return BaseResponse(data=execution)
    raise HTTPException(status_code=404, detail="Execution not found")
