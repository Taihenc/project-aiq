from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from src.core.domain.model.agent import Agent
from src.core.domain.value_object.config import ModelConfig


class AgentPort(ABC):
    """
    Input port for Agent operations.
    Defines the interface between REST API and application layer for agent management.
    """

    @abstractmethod
    async def create_agent(
        self,
        name: str,
        role: str,
        model_id: str,
        goal: Optional[str] = None,
        backstory: Optional[str] = None,
        tools: List[str] = None,
        default_config: Optional[ModelConfig] = None,
    ) -> Agent:
        """Create a new agent with the specified configuration."""
        pass

    @abstractmethod
    async def get_agent(self, agent_id: str) -> Agent:
        """Retrieve an agent by ID."""
        pass

    @abstractmethod
    async def list_agents(self) -> List[Agent]:
        """List all agents."""
        pass

    @abstractmethod
    async def update_agent(
        self,
        agent_id: str,
        backstory: Optional[str] = None,
        tools: Optional[List[str]] = None,
    ) -> Agent:
        """Update an existing agent's configuration."""
        pass

    @abstractmethod
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent by ID. Returns True if successful."""
        pass

    @abstractmethod
    async def run_agent(
        self,
        agent_id: str,
        prompt: str,
        history: List[Dict[str, str]],
        config_override: Optional[ModelConfig] = None,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute an agent with a prompt and conversation history.
        Returns response content, role, and usage statistics.
        """
        pass
