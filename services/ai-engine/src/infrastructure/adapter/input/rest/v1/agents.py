from fastapi import APIRouter, HTTPException, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from src.core.domain.model.agent import Agent
from src.core.domain.value_object.config import ModelConfig
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse

router = APIRouter()


class CreateAgentRequest(BaseModel):
    name: str
    role: str
    goal: Optional[str] = None
    backstory: Optional[str] = None
    model_id: str
    tools: List[str] = []
    default_config: Optional[ModelConfig] = None


class UpdateAgentRequest(BaseModel):
    backstory: Optional[str] = None
    tools: Optional[List[str]] = None


class RunAgentRequest(BaseModel):
    prompt: str
    history: List[Dict[str, str]]
    config_override: Optional[ModelConfig] = None
    stream: bool = False


class RunAgentResponse(BaseModel):
    content: str
    role: str = "assistant"
    usage: Dict[str, int]


@router.get("", response_model=BaseResponse[List[Agent]])
async def list_agents():
    return BaseResponse(data=[])


@router.post(
    "", response_model=BaseResponse[Agent], status_code=status.HTTP_201_CREATED
)
async def create_agent(payload: CreateAgentRequest):
    # Mock return
    agent = Agent(
        id="agent_01", name=payload.name, role=payload.role, model_id=payload.model_id
    )
    return BaseResponse(data=agent)


@router.get("/{agent_id}", response_model=BaseResponse[Agent])
async def get_agent(agent_id: str):
    raise HTTPException(status_code=404, detail="Agent not found")


@router.put("/{agent_id}", response_model=BaseResponse[Agent])
async def update_agent(agent_id: str, payload: UpdateAgentRequest):
    raise HTTPException(status_code=404, detail="Agent not found")


@router.post("/{agent_id}/run", response_model=BaseResponse[RunAgentResponse])
async def run_agent(agent_id: str, payload: RunAgentRequest):
    raise HTTPException(status_code=404, detail="Agent not found")


@router.delete("/{agent_id}", response_model=BaseResponse[None])
async def delete_agent(agent_id: str):
    raise HTTPException(status_code=404, detail="Agent not found")
