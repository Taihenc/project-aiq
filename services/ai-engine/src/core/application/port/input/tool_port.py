from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from src.core.domain.model.tool import Tool
from src.core.application.dto.tool import CreateToolRequest, UpdateToolRequest


class ToolPort(ABC):
    """
    Input port for Tool operations.
    Defines the interface between REST API and application layer for tool management.
    """

    @abstractmethod
    async def create_tool(self, request: CreateToolRequest) -> Tool:
        """Register a new tool."""
        pass

    @abstractmethod
    async def get_tool(self, tool_id: str) -> Tool:
        """Retrieve a tool by ID."""
        pass

    @abstractmethod
    async def list_tools(self) -> List[Tool]:
        """List all registered tools."""
        pass

    @abstractmethod
    async def update_tool(
        self,
        tool_id: str,
        request: UpdateToolRequest,
    ) -> Tool:
        """Update an existing tool configuration."""
        pass

    @abstractmethod
    async def delete_tool(self, tool_id: str) -> bool:
        """Delete a tool by ID. Returns True if successful."""
        pass
