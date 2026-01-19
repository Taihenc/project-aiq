from fastapi import APIRouter, HTTPException, status
from typing import List, Optional, Literal, Dict
from pydantic import BaseModel, HttpUrl
from src.core.domain.model.tool import Tool, ExecutionConfig
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse

router = APIRouter()


class RegisterToolRequest(BaseModel):
    name: str
    description: Optional[str] = None
    execution_config: ExecutionConfig


class UpdateToolRequest(BaseModel):
    description: Optional[str] = None
    execution_config: Optional[ExecutionConfig] = None


class RegisterToolResponse(BaseModel):
    id: str
    message: str
    discovered_functions: List[str]
    status: str


@router.get("", response_model=BaseResponse[List[Tool]])
async def list_tools():
    return BaseResponse(data=[])


@router.post(
    "",
    response_model=BaseResponse[RegisterToolResponse],
    status_code=status.HTTP_201_CREATED,
)
async def register_tool(payload: RegisterToolRequest):
    data = RegisterToolResponse(
        id="tool_01",
        message="Tool registered successfully",
        discovered_functions=["check_stock"],
        status="connected",
    )
    return BaseResponse(data=data)


@router.get("/{tool_id}", response_model=BaseResponse[Tool])
async def get_tool(tool_id: str):
    raise HTTPException(status_code=404, detail="Tool not found")


@router.put("/{tool_id}", response_model=BaseResponse[Tool])
async def update_tool(tool_id: str, payload: UpdateToolRequest):
    raise HTTPException(status_code=404, detail="Tool not found")


class ValidationResponse(BaseModel):
    id: str
    status: str
    message: str
    discovered_functions: List[str]
    last_checked: str


@router.post("/{tool_id}/validate", response_model=BaseResponse[ValidationResponse])
async def validate_tool(tool_id: str):
    raise HTTPException(status_code=404, detail="Tool not found")


@router.delete("/{tool_id}", response_model=BaseResponse[None])
async def delete_tool(tool_id: str):
    raise HTTPException(status_code=404, detail="Tool not found")
