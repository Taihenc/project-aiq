import asyncio
import json as _json
from typing import Any, Optional, Callable
from abc import ABC
from mcp import ClientSession
from mcp.client.sse import sse_client
from pydantic import BaseModel as PydanticBaseModel, Field, create_model
from crewai.tools import BaseTool
from src.config.settings import settings
from loguru import logger

# ──────────────────────────────────────────────
# Friendly display config for known tools
# ──────────────────────────────────────────────
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

# ──────────────────────────────────────────────
# Core MCP execution
# ──────────────────────────────────────────────


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


# ──────────────────────────────────────────────
# Dynamic MCP Tool Discovery & Creation
# ──────────────────────────────────────────────

_JSON_TYPE_MAP = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "array": list,
    "object": dict,
}


def _json_schema_to_pydantic(name: str, schema: dict) -> type[PydanticBaseModel]:
    """Convert a JSON Schema 'properties' block into a dynamic Pydantic model."""
    properties = schema.get("properties", {})
    required = set(schema.get("required", []))

    fields: dict[str, Any] = {}
    for field_name, prop in properties.items():
        python_type = _JSON_TYPE_MAP.get(prop.get("type", "string"), str)
        description = prop.get("description", "")

        if field_name in required:
            fields[field_name] = (python_type, Field(description=description))
        else:
            fields[field_name] = (
                Optional[python_type],
                Field(default=None, description=description),
            )

    model_name = f"{name.title().replace('_', '')}Input"
    return create_model(model_name, **fields)


async def fetch_mcp_schemas() -> list[dict]:
    """Connect to MCP server and retrieve all tool schemas."""
    async with sse_client(settings.mcp_server_url) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools_result = await session.list_tools()
            return [
                {
                    "name": tool.name,
                    "description": tool.description or f"Execute {tool.name}",
                    "input_schema": tool.inputSchema,
                }
                for tool in tools_result.tools
            ]


async def build_mcp_tools(
    status_callback: Optional[Callable] = None,
    overrides: Optional[dict[str, Callable]] = None,
) -> dict[str, BaseTool]:
    """
    Dynamically create CrewAI tools from MCP server schemas.

    Args:
        status_callback: Optional callback for reporting tool execution status.
        overrides: Dict of {mcp_tool_name: override_fn}.
                   override_fn receives (params: dict) and must return a modified dict.
                   Use this to inject/transform params or run pre-call logic.

    Returns:
        Dict of {tool_name: BaseTool instance} for easy access by name.
    """
    overrides = overrides or {}

    try:
        schemas = await fetch_mcp_schemas()
    except Exception as e:
        logger.error(f"Failed to fetch MCP schemas: {e}")
        return {}

    tools: dict[str, BaseTool] = {}

    for schema in schemas:
        tool_name = schema["name"]
        description = schema["description"]
        input_schema = schema.get("input_schema", {})

        # Build Pydantic model from JSON Schema
        args_model = _json_schema_to_pydantic(tool_name, input_schema)

        # Capture variables for the closure
        _tool_name = tool_name
        _description = description
        _override_fn = overrides.get(tool_name)
        _status_cb = status_callback

        # Dynamically create a BaseTool subclass
        class DynamicTool(BaseTool):
            name: str = f"proxy_{_tool_name}"
            description: str = _description
            args_schema: type[PydanticBaseModel] = args_model

            # Store in private attrs to avoid Pydantic field issues
            _mcp_name: str = _tool_name
            _override: Optional[Callable] = _override_fn
            _callback: Optional[Callable] = _status_cb

            def _run(self, **kwargs) -> str:
                params = dict(kwargs)
                if self._override:
                    # Pass the status callback to the override so it can report progress
                    params = self._override(params, self._callback)
                return run_mcp_sync(
                    execute_mcp_operation(self._mcp_name, params, self._callback)
                )

        tools[tool_name] = DynamicTool()

    return tools
