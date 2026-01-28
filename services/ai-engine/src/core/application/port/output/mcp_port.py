from abc import ABC, abstractmethod
from typing import List, Dict, Any


class MCPClient(ABC):
    """
    Output port for Model Context Protocol clients.
    Defines the interface for discovering and executing tools via MCP (SSE, HTTP, WebSocket).
    """

    @abstractmethod
    async def get_tools(self) -> List[Dict[str, Any]]:
        """
        Discover available tools from MCP server.

        Returns:
            List of tool definitions, each containing:
                - name: Tool name
                - description: What the tool does
                - parameters: JSON schema for tool parameters
        """
        pass

    @abstractmethod
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """
        Execute a tool with given arguments.

        Args:
            tool_name: Name of the tool to call
            arguments: Tool parameters as dictionary

        Returns:
            Tool execution result (type depends on tool)
        """
        pass

    @abstractmethod
    async def get_tool_schema(self, tool_name: str) -> Dict[str, Any]:
        """
        Get parameter schema for a specific tool.

        Args:
            tool_name: Name of the tool

        Returns:
            JSON schema describing tool parameters
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """
        Close connection to MCP server.
        """
        pass
