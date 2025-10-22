from crewai import Agent
from typing import Dict, List, Optional
from fastapi import HTTPException
from app.models.agents import AgentConfig
from app.schemas.base import BaseResponse
from app.services.models import ModelService
from app.services.tools import ToolService
from app.config import settings


class AgentService:

    def __init__(self):
        self._agent_configs: Dict[str, AgentConfig] = (
            settings.AGENTS
        )  # TODO: In future, we will use database to store agent configs
        self.model_service = ModelService()
        self.tool_service = ToolService()

    # ============================================================================
    # Agent Config CRUD Operations
    # ============================================================================

    def create_agent_config(self, config: AgentConfig) -> BaseResponse:
        try:
            if config.name in self._agent_configs:
                raise HTTPException(
                    status_code=409, detail=f"Agent '{config.name}' already exists"
                )
            self._agent_configs[config.name] = config
            return BaseResponse(
                success=True,
                message="Agent config created successfully",
                data={"config": config},
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def get_agents_config(self) -> BaseResponse:
        try:
            return BaseResponse(
                success=True,
                message="Agent configs fetched successfully",
                data={
                    "configs": self._agent_configs,
                    "count": len(self._agent_configs),
                },
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def get_agent_config(self, agent: str) -> BaseResponse:
        try:
            config = self._agent_configs.get(agent)
            if not config:
                raise HTTPException(
                    status_code=404, detail=f"Agent '{agent}' not found"
                )
            return BaseResponse(
                success=True,
                message="Agent config fetched successfully",
                data={"config": config},
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def update_agent_config(self, config: AgentConfig) -> BaseResponse:
        try:
            if config.name not in self._agent_configs:
                raise HTTPException(
                    status_code=404, detail=f"Agent '{config.name}' not found"
                )
            self._agent_configs[config.name] = config
            return BaseResponse(
                success=True,
                message="Agent config updated successfully",
                data={"config": config},
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def delete_agent_config(self, agent: str) -> BaseResponse:
        try:
            if agent not in self._agent_configs:
                raise HTTPException(
                    status_code=404, detail=f"Agent '{agent}' not found"
                )
            del self._agent_configs[agent]
            return BaseResponse(
                success=True,
                message="Agent config deleted successfully",
                data={"agent": agent},
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    # ============================================================================
    # Agent Runtime Operations
    # ============================================================================

    def get_agent(self, agent: str) -> Optional[Agent]:
        config = self._agent_configs.get(agent)
        if not config:
            return None

        llm = self.model_service.get_model(config.model)
        if not llm:
            raise ValueError(f"Model '{config.model}' not found in ModelService")

        tools = self._fetch_tools(config)

        agent_params = {
            "role": config.role,
            "goal": config.goal,
            "backstory": config.backstory,
            "llm": llm,
            "verbose": config.verbose,
        }

        if tools:
            agent_params["tools"] = tools

        return Agent(**agent_params)

    # ============================================================================
    # Helper Methods
    # ============================================================================

    def _fetch_tools(self, config: AgentConfig) -> Optional[List]:
        """Fetch tools for agent based on config."""
        if not config.tools:
            return None

        return self.tool_service.get_tools(config.tools)
