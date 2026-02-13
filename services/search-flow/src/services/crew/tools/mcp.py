import asyncio
from typing import Type, Any, Dict
from crewai.tools import BaseTool
from pydantic import BaseModel
from mcp import ClientSession
from mcp.client.sse import sse_client
from src.config.settings import settings


class MCPTool(BaseTool):
    mcp_tool_name: str

    def _run(self, **kwargs) -> str:
        """Run the tool synchronously."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                return asyncio.run_coroutine_threadsafe(
                    self._run_async(**kwargs), loop
                ).result()
            else:
                return asyncio.run(self._run_async(**kwargs))
        except RuntimeError:
            return asyncio.run(self._run_async(**kwargs))

    async def _run_async(self, **kwargs) -> str:
        """Run the tool asynchronously via MCP SSE."""
        try:
            async with sse_client(settings.mcp_server_url) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()

                    result = await session.call_tool(self.mcp_tool_name, kwargs)

                    final_result = ""
                    if hasattr(result, "content"):
                        for content in result.content:
                            if hasattr(content, "text"):
                                final_result += content.text + "\n"
                            else:
                                final_result += str(content) + "\n"
                    else:
                        final_result = str(result)

                    return final_result.strip()
        except Exception as e:
            error_msg = str(e)
            # Handle anyio/asyncio TaskGroup errors which often mask connection issues
            if "TaskGroup" in error_msg or "ConnectError" in error_msg:
                error_msg += (
                    f"\n👉 Check if MCP server is running at {settings.mcp_server_url}"
                )

            return f"Error calling MCP tool '{self.mcp_tool_name}': {error_msg}"
