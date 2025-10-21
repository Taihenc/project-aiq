from crewai import Agent
from typing import Dict, List, Optional
from app.models import AgentConfig
from app.services import ModelService
from app.services.tools import ToolService
from app.config import settings


class AgentService:

    def __init__(self):
        self._agent_configs: Dict[str, AgentConfig] = settings.AGENTS
        self.model_service = ModelService()
        self.tool_service = ToolService()

    # ============================================================================
    # Agent Config CRUD Operations
    # ============================================================================

    def create_agent_config(self, config: AgentConfig) -> bool:
        if config.name in self._agent_configs:
            return False
        self._agent_configs[config.name] = config
        return True

    def get_agents_config(self) -> Dict[str, AgentConfig]:
        return self._agent_configs

    def get_agent_config(self, agent: str) -> Optional[AgentConfig]:
        return self._agent_configs.get(agent)

    def update_agent_config(self, agent: str, config: AgentConfig) -> bool:
        if agent not in self._agent_configs:
            return False
        self._agent_configs[agent] = config
        return True

    def delete_agent_config(self, agent: str) -> bool:
        if agent not in self._agent_configs:
            return False
        del self._agent_configs[agent]
        return True

    # ============================================================================
    # Agent Runtime Operations
    # ============================================================================

    def get_agent(self, agent: str) -> Agent:
        config = self.get_agent_config(agent)
        # if not config:
        #     return None

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

        tools = self.tool_service.get_tools(config.tools)
        return tools if tools else None
