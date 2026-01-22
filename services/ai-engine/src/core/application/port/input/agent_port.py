from abc import ABC, abstractmethod
from typing import List, Optional
from src.core.domain.model.agent import Agent
from src.core.application.dto.agent import CreateAgentRequest, UpdateAgentRequest


class AgentPort(ABC):
    """
    Input port for Agent operations.
    Defines the interface between REST API and application layer for agent management.
    """

    @abstractmethod
    async def create_agent(self, request: CreateAgentRequest) -> Agent:
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
        request: UpdateAgentRequest,
    ) -> Agent:
        """Update an existing agent's configuration."""
        pass

    @abstractmethod
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent by ID. Returns True if successful."""
        pass
