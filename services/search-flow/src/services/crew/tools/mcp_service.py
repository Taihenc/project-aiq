import asyncio
import json as _json
from typing import Optional, Callable
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
        "result_key": "results",
    },
    "get_pages": {
        "start": "Reading document pages",
        "connecting": "Connecting to document service...",
        "result": "Retrieved document pages",
        "empty": "No pages found",
        "result_key": "pages",
    },
    "get_chunks": {
        "start": "Retrieving content segments",
        "connecting": "Connecting to content service...",
        "result": "Retrieved content segments",
        "empty": "No content segments found",
        "result_key": "chunks",
    },
}


async def execute_mcp_operation(
    mcp_tool_name: str, params: dict, status_callback: Optional[Callable] = None
) -> str:
    """
    Unified function to execute an MCP tool call over SSE and format the result.
    """
    config = _TOOL_CONFIG.get(
        mcp_tool_name,
        {
            "start": f"Executing {mcp_tool_name.replace('_', ' ').title()}",
            "connecting": "Connecting to service...",
            "result": "Got results",
            "empty": "No results returned",
        },
    )

    def report(msg: str):
        if status_callback:
            try:
                status_callback(msg)
            except Exception:
                pass

    try:
        report(config["connecting"])

        async with sse_client(settings.mcp_server_url) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                report(f"Executing {mcp_tool_name.replace('_', ' ')}...")
                result = await session.call_tool(mcp_tool_name, params)

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
                count = None
                try:
                    data = _json.loads(final_result)

                    # Deterministic parsing using configured result_key
                    result_key = config.get("result_key")
                    if result_key and result_key in data:
                        target_data = data[result_key]
                        if isinstance(target_data, list):
                            count = len(target_data)
                    # Fallback for plain array response
                    elif isinstance(data, list):
                        count = len(data)
                except Exception:
                    pass

                if count is not None and count > 0:
                    report(
                        f"{config['result']} — {count} result{'s' if count != 1 else ''}"
                    )
                elif count == 0:
                    report(config["empty"])
                else:
                    report("Processing retrieved data...")

                return final_result

    except Exception as e:
        error_msg = str(e)
        if "TaskGroup" in error_msg or "ConnectError" in error_msg:
            report("Connection error — retrying...")
            error_msg += (
                f"\n👉 Check if MCP server is running at {settings.mcp_server_url}"
            )
        else:
            report(f"Error during {mcp_tool_name.replace('_', ' ')}")

        return f"Error calling MCP tool '{mcp_tool_name}': {error_msg}"


def run_mcp_sync(coro):
    """Helper to run async code synchronously in CrewAI tools."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return asyncio.run_coroutine_threadsafe(coro, loop).result()
        return asyncio.run(coro)
    except RuntimeError:
        return asyncio.run(coro)
