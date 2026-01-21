from typing import List, Optional, Dict, Any
from datetime import datetime
from src.core.application.port.output.repository import ToolRepository
from src.core.application.port.input.tool_port import ToolPort
from src.core.domain.model.tool import Tool
from src.core.application.dto.tool import CreateToolRequest, UpdateToolRequest
from src.core.domain.exceptions import (
    EntityNotFoundException,
    DuplicateEntityException,
)


class ToolService(ToolPort):
    """
    Service for managing Tools.
    """

    def __init__(self, tool_repository: ToolRepository):
        self.tool_repository = tool_repository

    async def list_tools(self) -> List[Tool]:
        """
        List all registered tools.
        """
        return await self.tool_repository.list()

    async def get_tool(self, tool_id: str) -> Tool:
        """
        Get a specific tool by ID.
        """
        tool = await self.tool_repository.get(tool_id)
        if not tool:
            raise EntityNotFoundException(f"Tool not found: {tool_id}")
        return tool

    async def create_tool(self, request: CreateToolRequest) -> Tool:
        """
        Register a new tool.
        """
        # Check for duplicates by name
        existing_tools = await self.tool_repository.list()
        for t in existing_tools:
            if t.name == request.name:
                raise DuplicateEntityException(
                    f"Tool with name '{request.name}' already exists"
                )

        tool = Tool(**request.model_dump())
        return await self.tool_repository.create(tool)

    async def update_tool(self, tool_id: str, request: UpdateToolRequest) -> Tool:
        """
        Update an existing tool configuration.
        """
        existing = await self.get_tool(tool_id)

        # Check for duplicates if name is changing
        if request.name is not None and request.name != existing.name:
            existing_tools = await self.tool_repository.list()
            for t in existing_tools:
                if t.name == request.name:
                    raise DuplicateEntityException(
                        f"Tool with name '{request.name}' already exists"
                    )

        update_data = request.model_dump(exclude_unset=True)
        updated_tool = existing.model_copy(update=update_data)
        updated_tool.updated_at = datetime.utcnow()

        return await self.tool_repository.update(updated_tool)

    async def delete_tool(self, tool_id: str) -> bool:
        """
        Delete a tool.
        """
        existing = await self.tool_repository.get(tool_id)
        if not existing:
            raise EntityNotFoundException(f"Tool not found: {tool_id}")
        return await self.tool_repository.delete(tool_id)
