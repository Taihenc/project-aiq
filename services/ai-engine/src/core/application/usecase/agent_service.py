from typing import List
from datetime import datetime
from src.core.application.port.output.repository import (
    AgentRepository,
    ModelRepository,
    ToolRepository,
)
from src.core.application.port.input.agent_port import AgentPort
from src.core.domain.model.agent import Agent
from src.core.application.dto.agent import CreateAgentRequest, UpdateAgentRequest
from src.core.domain.exceptions import (
    EntityNotFoundException,
    DuplicateEntityException,
)


class AgentService(AgentPort):
    """
    Service for managing Agents.
    """

    def __init__(
        self,
        agent_repository: AgentRepository,
        model_repository: ModelRepository,
        tool_repository: ToolRepository,
    ):
        self.agent_repository = agent_repository
        self.model_repository = model_repository
        self.tool_repository = tool_repository

    async def list_agents(self) -> List[Agent]:
        """
        List all registered agents.
        """
        return await self.agent_repository.list()

    async def get_agent(self, agent_id: str) -> Agent:
        """
        Get a specific agent by ID.
        """
        agent = await self.agent_repository.get(agent_id)
        if not agent:
            raise EntityNotFoundException(f"Agent not found: {agent_id}")
        return agent

    async def create_agent(self, request: CreateAgentRequest) -> Agent:
        """
        Create a new agent.
        """
        # Check for duplicates by name
        existing_agents = await self.agent_repository.list()
        for a in existing_agents:
            if a.name == request.name:
                raise DuplicateEntityException(
                    f"Agent with name '{request.name}' already exists"
                )

        # Validate model existence
        model = await self.model_repository.get(request.model_id)
        if not model:
            raise EntityNotFoundException(f"Model not found: {request.model_id}")

        # Validate tools existence
        if request.tools:
            for tool_id in request.tools:
                tool = await self.tool_repository.get(tool_id)
                if not tool:
                    raise EntityNotFoundException(f"Tool not found: {tool_id}")

        agent = Agent(**request.model_dump())
        return await self.agent_repository.create(agent)

    async def update_agent(self, agent_id: str, request: UpdateAgentRequest) -> Agent:
        """
        Update an existing agent configuration.
        """
        existing = await self.agent_repository.get(agent_id)
        if not existing:
            raise EntityNotFoundException(f"Agent not found: {agent_id}")

        # Check for duplicates if name is changing
        if request.name is not None and request.name != existing.name:
            existing_agents = await self.agent_repository.list()
            for a in existing_agents:
                if a.name == request.name:
                    raise DuplicateEntityException(
                        f"Agent with name '{request.name}' already exists"
                    )

        # Validate model existence if changed
        if request.model_id is not None:
            model = await self.model_repository.get(request.model_id)
            if not model:
                raise EntityNotFoundException(f"Model not found: {request.model_id}")

        # Validate tools existence if changed
        if request.tools is not None:
            for tool_id in request.tools:
                tool = await self.tool_repository.get(tool_id)
                if not tool:
                    raise EntityNotFoundException(f"Tool not found: {tool_id}")

        update_data = request.model_dump(exclude_unset=True)
        updated_agent = existing.model_copy(update=update_data)
        updated_agent.updated_at = datetime.utcnow()

        return await self.agent_repository.update(updated_agent)

    async def delete_agent(self, agent_id: str) -> bool:
        """
        Delete an agent.
        """
        existing = await self.agent_repository.get(agent_id)
        if not existing:
            raise EntityNotFoundException(f"Agent not found: {agent_id}")
        return await self.agent_repository.delete(agent_id)
