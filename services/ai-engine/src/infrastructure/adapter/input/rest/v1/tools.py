from fastapi import APIRouter, status, Depends
from typing import List
from src.core.domain.model.tool import Tool
from src.core.application.usecase.tool_service import ToolService
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse
from src.infrastructure.config.dependencies import get_tool_service
from src.core.application.dto.tool import CreateToolRequest, UpdateToolRequest
from src.infrastructure.adapter.input.rest.v1.examples.tool_examples import (
    LIST_TOOLS_RESPONSES,
    GET_TOOL_RESPONSES,
    CREATE_TOOL_RESPONSES,
    UPDATE_TOOL_RESPONSES,
    DELETE_TOOL_RESPONSES,
)

router = APIRouter()


@router.get(
    "",
    response_model=BaseResponse[List[Tool]],
    responses=LIST_TOOLS_RESPONSES,
)
async def list_tools(
    service: ToolService = Depends(get_tool_service),
):
    """List all registered tools."""
    tools = await service.list_tools()
    return BaseResponse(data=tools, message="Tools retrieved successfully")


@router.get(
    "/{tool_id}",
    response_model=BaseResponse[Tool],
    responses=GET_TOOL_RESPONSES,
)
async def get_tool(
    tool_id: str,
    service: ToolService = Depends(get_tool_service),
):
    """Get a specific tool by ID."""
    tool = await service.get_tool(tool_id)
    return BaseResponse(data=tool, message="Tool retrieved successfully")


@router.post(
    "",
    response_model=BaseResponse[Tool],
    responses=CREATE_TOOL_RESPONSES,
    status_code=status.HTTP_201_CREATED,
)
async def create_tool(
    request: CreateToolRequest,
    service: ToolService = Depends(get_tool_service),
):
    """Register a new tool."""
    created_tool = await service.create_tool(request)
    return BaseResponse(data=created_tool, message="Tool created successfully")


@router.put(
    "/{tool_id}",
    response_model=BaseResponse[Tool],
    responses=UPDATE_TOOL_RESPONSES,
)
async def update_tool(
    tool_id: str,
    request: UpdateToolRequest,
    service: ToolService = Depends(get_tool_service),
):
    """Update an existing tool configuration."""
    updated_tool = await service.update_tool(tool_id, request)
    return BaseResponse(data=updated_tool, message="Tool updated successfully")


@router.delete(
    "/{tool_id}",
    response_model=BaseResponse[bool],
    responses=DELETE_TOOL_RESPONSES,
)
async def delete_tool(
    tool_id: str,
    service: ToolService = Depends(get_tool_service),
):
    """Delete a tool."""
    result = await service.delete_tool(tool_id)
    return BaseResponse(data=result, message="Tool deleted successfully")
