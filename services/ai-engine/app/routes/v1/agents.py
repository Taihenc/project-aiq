from fastapi import APIRouter, HTTPException, Path, Body
from app.services import AgentService
from app.models.agents import AgentConfig
from app.schemas import BaseResponse

router = APIRouter()

agent_service = AgentService()


@router.post(
    "/",
    response_model=BaseResponse,
    summary="Create New Agent Configuration",
    description="Create a new agent configuration with specified role, goal, and backstory",
    responses={
        200: {
            "description": "Successfully created agent configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Agent config created successfully",
                        "data": {
                            "config": {
                                "name": "researcher",
                                "role": "Researcher",
                                "goal": "Research and gather information on given topics",
                                "backstory": "You are an expert researcher with years of experience in data analysis and information gathering",
                                "model": "gpt-4o-mini",
                                "tools": ["web_search", "document_search"],
                                "verbose": False,
                            }
                        },
                    }
                }
            },
        },
        400: {
            "description": "Failed to create agent configuration",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to create agent config"}
                }
            },
        },
        409: {
            "description": "Agent already exists",
            "content": {
                "application/json": {
                    "example": {"detail": f"Agent 'researcher' already exists"}
                }
            },
        },
    },
)
async def create_agent_config(
    config: AgentConfig = Body(
        example={
            "name": "researcher",
            "role": "Researcher",
            "goal": "Research and gather information on given topics",
            "backstory": "You are an expert researcher with years of experience in data analysis and information gathering",
            "model": "gpt-4o-mini",
            "tools": ["web_search", "document_search"],
            "verbose": False,
        },
    )
):
    if agent_service.get_agent_config(config.name):
        raise HTTPException(
            status_code=409, detail=f"Agent '{config.name}' already exists"
        )
    if not agent_service.create_agent_config(config):
        raise HTTPException(status_code=400, detail="Failed to create agent config")
    return BaseResponse(
        success=True,
        message="Agent config created successfully",
        data={
            "config": config,
        },
    )


@router.get(
    "/",
    response_model=BaseResponse,
    summary="Get All Available Agent Configurations",
    description="Retrieve all available agent configurations in the system with their details",
    responses={
        200: {
            "description": "Successfully retrieved agent configurations list",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Agent configs fetched successfully",
                        "data": {
                            "configs": {
                                "researcher": {
                                    "name": "researcher",
                                    "role": "Researcher",
                                    "goal": "Research and gather information on given topics",
                                    "backstory": "You are an expert researcher with years of experience in data analysis and information gathering",
                                    "model": "gpt-4o-mini",
                                    "tools": ["web_search", "document_search"],
                                    "verbose": False,
                                },
                                "writer": {
                                    "name": "writer",
                                    "role": "Writer",
                                    "goal": "Create engaging and informative content",
                                    "backstory": "You are a skilled writer with expertise in various writing styles and formats",
                                    "model": "gpt-4o-mini",
                                    "tools": ["web_search"],
                                    "verbose": False,
                                },
                            },
                            "count": 2,
                        },
                    }
                }
            },
        }
    },
)
async def get_agents_config():
    configs = agent_service.get_agents_config()
    return BaseResponse(
        success=True,
        message="Agent configs fetched successfully",
        data={
            "configs": configs,
            "count": len(configs),
        },
    )


@router.get(
    "/{agent}",
    response_model=BaseResponse,
    summary="Get Specific Agent Configuration",
    description="Retrieve configuration details for a specific agent",
    responses={
        200: {
            "description": "Successfully retrieved agent configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Agent config fetched successfully",
                        "data": {
                            "config": {
                                "name": "researcher",
                                "role": "Researcher",
                                "goal": "Research and gather information on given topics",
                                "backstory": "You are an expert researcher with years of experience in data analysis and information gathering",
                                "model": "gpt-4o-mini",
                                "tools": ["web_search", "document_search"],
                                "verbose": False,
                            }
                        },
                    }
                }
            },
        },
        404: {
            "description": "Agent not found",
            "content": {
                "application/json": {
                    "example": {"detail": f"Agent 'researcher' not found"}
                }
            },
        },
    },
)
async def get_agent_config(
    agent: str = Path(
        ...,
        description="Name of the agent to retrieve configuration for",
        example="researcher",
        min_length=1,
        max_length=50,
    )
):
    config = agent_service.get_agent_config(agent)
    if not config:
        raise HTTPException(status_code=404, detail=f"Agent '{agent}' not found")
    return BaseResponse(
        success=True,
        message="Agent config fetched successfully",
        data={
            "config": config,
        },
    )


@router.put(
    "/",
    response_model=BaseResponse,
    summary="Update Agent Configuration",
    description="Update configuration for an existing agent using name from request body",
    responses={
        200: {
            "description": "Successfully updated agent configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Agent config updated successfully",
                        "data": {
                            "config": {
                                "name": "researcher",
                                "role": "Senior Researcher",
                                "goal": "Research and gather comprehensive information on given topics",
                                "backstory": "You are a senior expert researcher with extensive experience in data analysis and information gathering",
                                "model": "gpt-4o-mini",
                                "tools": [
                                    "web_search",
                                    "document_search",
                                    "data_analysis",
                                ],
                                "verbose": False,
                            }
                        },
                    }
                }
            },
        },
        400: {
            "description": "Failed to update agent configuration",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to update agent config"}
                }
            },
        },
        404: {
            "description": "Agent not found",
            "content": {
                "application/json": {
                    "example": {"detail": f"Agent 'researcher' not found"}
                }
            },
        },
    },
)
async def update_agent_config(
    config: AgentConfig = Body(
        example={
            "name": "researcher",
            "role": "Senior Researcher",
            "goal": "Research and gather comprehensive information on given topics",
            "backstory": "You are a senior expert researcher with extensive experience in data analysis and information gathering",
            "model": "gpt-4o-mini",
            "tools": ["web_search", "document_search", "data_analysis"],
            "verbose": False,
        },
    ),
):
    existing_agent = agent_service.get_agent_config(config.name)
    if not existing_agent:
        raise HTTPException(status_code=404, detail=f"Agent '{config.name}' not found")

    if not agent_service.update_agent_config(config.name, config):
        raise HTTPException(status_code=400, detail="Failed to update agent config")
    return BaseResponse(
        success=True,
        message="Agent config updated successfully",
        data={
            "config": config,
        },
    )


@router.delete(
    "/{agent}",
    response_model=BaseResponse,
    summary="Delete Agent Configuration",
    description="Delete an existing agent configuration",
    responses={
        200: {
            "description": "Successfully deleted agent configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Agent config deleted successfully",
                        "data": {"agent": "researcher"},
                    }
                }
            },
        },
        400: {
            "description": "Failed to delete agent configuration",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to delete agent config"}
                }
            },
        },
        404: {
            "description": "Agent not found",
            "content": {
                "application/json": {
                    "example": {"detail": f"Agent 'researcher' not found"}
                }
            },
        },
    },
)
async def delete_agent_config(
    agent: str = Path(
        ...,
        description="Name of the agent to delete",
        example="researcher",
        min_length=1,
        max_length=50,
    )
):
    existing_agent = agent_service.get_agent_config(agent)
    if not existing_agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent}' not found")

    if not agent_service.delete_agent_config(agent):
        raise HTTPException(status_code=400, detail="Failed to delete agent config")
    return BaseResponse(
        success=True,
        message="Agent config deleted successfully",
        data={
            "agent": agent,
        },
    )
