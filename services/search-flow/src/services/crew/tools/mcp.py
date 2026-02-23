import asyncio
import json as _json
from typing import Type, Any, Dict, Optional, Callable
from crewai.tools import BaseTool
from pydantic import BaseModel, Field as PydanticField
from mcp import ClientSession
from mcp.client.sse import sse_client
from src.config.settings import settings


# Friendly display config for known tools
_TOOL_CONFIG = {
    "search_documents": {
        "start": "Searching knowledge base",
        "connecting": "Connecting to search service...",
        "result": "Found relevant documents",
        "empty": "No matching documents found",
    },
    "get_pages": {
        "start": "Reading document pages",
        "connecting": "Connecting to document service...",
        "result": "Retrieved document pages",
        "empty": "No pages found",
    },
    "get_chunks": {
        "start": "Retrieving content segments",
        "connecting": "Connecting to content service...",
        "result": "Retrieved content segments",
        "empty": "No content segments found",
    },
}


class MCPTool(BaseTool):
    mcp_tool_name: str
    status_callback: Optional[Callable] = PydanticField(default=None, exclude=True)

    def _get_config(self) -> dict:
        """Get display config for this tool."""
        default = {
            "start": f"Using {self.mcp_tool_name.replace('_', ' ').title()}",
            "connecting": "Connecting to service...",
            "result": "Got results",
            "empty": "No results returned",
        }
        return _TOOL_CONFIG.get(self.mcp_tool_name, default)

    def _format_detail(self, kwargs: dict) -> str:
        """Extract a meaningful detail snippet from the tool arguments."""
        if self.mcp_tool_name == "search_documents" and "query" in kwargs:
            query = kwargs["query"]
            if len(query) > 60:
                query = query[:57] + "..."
            return f"'{query}'"
        elif self.mcp_tool_name == "get_pages":
            file_path = kwargs.get("file_path", "")
            if file_path:
                # Show just the filename
                name = file_path.split("/")[-1] if "/" in file_path else file_path
                if len(name) > 40:
                    name = name[:37] + "..."
                return name
            page_numbers = kwargs.get("page_numbers", [])
            if page_numbers:
                return f"pages {page_numbers}"
        elif self.mcp_tool_name == "get_chunks":
            chunk_id = kwargs.get("chunk_id", "")
            if chunk_id:
                return f"chunk {chunk_id[:12]}..."

        # Generic fallback
        if kwargs:
            vals = [str(v) for v in kwargs.values() if v]
            snippet = ", ".join(vals)
            if len(snippet) > 50:
                snippet = snippet[:47] + "..."
            return snippet
        return ""

    def _report(self, msg: str):
        """Safely call the status callback."""
        if self.status_callback:
            try:
                self.status_callback(msg)
            except Exception:
                pass

    def _count_results(self, result_text: str) -> Optional[int]:
        """Try to count results from the response."""
        try:
            data = _json.loads(result_text)
            # Common patterns for result arrays
            for key in ["results", "documents", "chunks", "pages", "items", "data"]:
                if key in data and isinstance(data[key], list):
                    return len(data[key])
            if isinstance(data, list):
                return len(data)
        except Exception:
            pass
        return None

    def _run(self, **kwargs) -> str:
        """Run the tool synchronously."""
        config = self._get_config()
        detail = self._format_detail(kwargs)

        # Report start
        start_msg = config["start"]
        if detail:
            if self.mcp_tool_name == "search_documents":
                start_msg += f" for {detail}"
            else:
                start_msg += f" — {detail}"
        self._report(start_msg)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                result = asyncio.run_coroutine_threadsafe(
                    self._run_async_with_status(config, **kwargs), loop
                ).result()
            else:
                result = asyncio.run(self._run_async_with_status(config, **kwargs))
        except RuntimeError:
            result = asyncio.run(self._run_async_with_status(config, **kwargs))

        return result

    async def _run_async_with_status(self, config: dict, **kwargs) -> str:
        """Run async with detailed status reporting."""
        try:
            self._report(config["connecting"])

            async with sse_client(settings.mcp_server_url) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()

                    self._report(f"Executing {self.mcp_tool_name.replace('_', ' ')}...")
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

                    final_result = final_result.strip()

                    # Report result count if possible
                    count = self._count_results(final_result)
                    if count is not None and count > 0:
                        self._report(f"{config['result']} — {count} result{'s' if count != 1 else ''}")
                    elif count == 0:
                        self._report(config["empty"])
                    else:
                        self._report("Processing retrieved data...")

                    return final_result

        except Exception as e:
            error_msg = str(e)
            if "TaskGroup" in error_msg or "ConnectError" in error_msg:
                self._report("Connection error — retrying...")
                error_msg += (
                    f"\n👉 Check if MCP server is running at {settings.mcp_server_url}"
                )
            else:
                self._report(f"Error during {self.mcp_tool_name.replace('_', ' ')}")

            return f"Error calling MCP tool '{self.mcp_tool_name}': {error_msg}"

    async def _run_async(self, **kwargs) -> str:
        """Fallback async run without status reporting."""
        config = self._get_config()
        return await self._run_async_with_status(config, **kwargs)
