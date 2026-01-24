from src.core.application.port.output.mcp_port import MCPClient
from typing import Any


class SSEClient(MCPClient):
    async def get_tools(self) -> list[dict[str, Any]]:
        # Placeholder for discovering tools via SSE
        return []

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        # Placeholder for calling a tool
        return f"Result of {tool_name}"
