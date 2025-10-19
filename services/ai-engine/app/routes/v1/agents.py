from fastapi import APIRouter
from app.services import AgentService

router = APIRouter()

agent_service = AgentService()


@router.post(f"/")
async def create_agent():
    return agent_service.create_agent()


@router.get(f"/")
async def get_agents():
    return agent_service.get_agents()


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    return agent_service.get_agent(agent_id)


@router.put("/{agent_id}")
async def update_agent(agent_id: str):
    return agent_service.update_agent(agent_id)


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    return agent_service.delete_agent(agent_id)
