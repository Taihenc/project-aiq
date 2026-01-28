from fastapi import APIRouter, status, Depends
from typing import List
from src.core.domain.model.agent import Agent
from src.core.application.usecase.agent_service import AgentService
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse
from src.infrastructure.config.dependencies import get_agent_service
from src.core.application.dto.agent import CreateAgentRequest, UpdateAgentRequest
from src.infrastructure.adapter.input.rest.v1.examples.agent_examples import (
    LIST_AGENTS_RESPONSES,
    GET_AGENT_RESPONSES,
    CREATE_AGENT_RESPONSES,
    UPDATE_AGENT_RESPONSES,
    DELETE_AGENT_RESPONSES,
)

router = APIRouter()


@router.get(
    "",
    response_model=BaseResponse[List[Agent]],
    responses=LIST_AGENTS_RESPONSES,
)
async def list_agents(
    service: AgentService = Depends(get_agent_service),
):
    """List all registered agents."""
    agents = await service.list_agents()
    return BaseResponse(data=agents, message="Agents retrieved successfully")


@router.get(
    "/{agent_id}",
    response_model=BaseResponse[Agent],
    responses=GET_AGENT_RESPONSES,
)
async def get_agent(
    agent_id: str,
    service: AgentService = Depends(get_agent_service),
):
    """Get a specific agent by ID."""
    agent = await service.get_agent(agent_id)
    return BaseResponse(data=agent, message="Agent retrieved successfully")


@router.post(
    "",
    response_model=BaseResponse[Agent],
    responses=CREATE_AGENT_RESPONSES,
    status_code=status.HTTP_201_CREATED,
)
async def create_agent(
    request: CreateAgentRequest,
    service: AgentService = Depends(get_agent_service),
):
    """Create a new agent."""
    created_agent = await service.create_agent(request)
    return BaseResponse(data=created_agent, message="Agent created successfully")


@router.put(
    "/{agent_id}",
    response_model=BaseResponse[Agent],
    responses=UPDATE_AGENT_RESPONSES,
)
async def update_agent(
    agent_id: str,
    request: UpdateAgentRequest,
    service: AgentService = Depends(get_agent_service),
):
    """Update an existing agent configuration."""
    updated_agent = await service.update_agent(agent_id, request)
    return BaseResponse(data=updated_agent, message="Agent updated successfully")


@router.delete(
    "/{agent_id}",
    response_model=BaseResponse[bool],
    responses=DELETE_AGENT_RESPONSES,
)
async def delete_agent(
    agent_id: str,
    service: AgentService = Depends(get_agent_service),
):
    """Delete an agent."""
    result = await service.delete_agent(agent_id)
    return BaseResponse(data=result, message="Agent deleted successfully")
