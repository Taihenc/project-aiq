from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from src.core.domain.model.tool import Tool, ExecutionConfig


class ToolPort(ABC):
    """
    Input port for Tool operations.
    Defines the interface between REST API and application layer for tool management.
    """

    @abstractmethod
    async def create_tool(
        self,
        name: str,
        execution_config: ExecutionConfig,
        description: Optional[str] = None,
    ) -> Tool:
        """Register a new tool with MCP execution configuration."""
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
        name: Optional[str] = None,
        description: Optional[str] = None,
        execution_config: Optional[ExecutionConfig] = None,
    ) -> Tool:
        """Update an existing tool configuration."""
        pass

    @abstractmethod
    async def delete_tool(self, tool_id: str) -> bool:
        """Delete a tool by ID. Returns True if successful."""
        pass

    @abstractmethod
    async def check_tool_health(self, tool_id: str) -> Dict[str, Any]:
        """
        Check tool connectivity and health status.
        Returns status, last_checked timestamp, and discovered functions.
        """
        pass
