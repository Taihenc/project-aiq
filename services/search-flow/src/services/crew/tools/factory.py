import asyncio
from typing import List, Dict, Any, Type
from pydantic import BaseModel, create_model, Field
from mcp import ClientSession
from mcp.client.sse import sse_client
from src.config.settings import settings
from src.services.crew.tools.mcp import MCPTool

# Mapping from JSON Schema types to Python types
TYPE_MAPPING = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "array": list,
    "object": dict,
}


def _json_schema_to_pydantic_fields(schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert JSON Schema properties to Pydantic field definitions.
    This is a simplified converter.
    """
    fields = {}
    properties = schema.get("properties", {})
    required = schema.get("required", [])

    for name, prop in properties.items():
        json_type = prop.get("type", "string")
        python_type = TYPE_MAPPING.get(json_type, str)
        description = prop.get("description", "")

        # Handle simple array types if possible (e.g., array of strings)
        if json_type == "array" and "items" in prop:
            item_type = prop["items"].get("type")
            if item_type in TYPE_MAPPING:
                python_type = List[TYPE_MAPPING[item_type]]

        default_value = prop.get("default", ...)

        if name not in required and default_value is ...:
            default_value = None
            # Optional field

        fields[name] = (
            python_type,
            Field(default=default_value, description=description),
        )

    return fields


class MCPToolFactory:
    @staticmethod
    async def get_tools() -> List[MCPTool]:
        """
        Connects to the MCP server, lists available tools,
        and converts them into CrewAI-compatible MCPTool instances
        with dynamic Pydantic args_schemas.
        """
        tools: List[MCPTool] = []

        try:
            async with sse_client(settings.mcp_server_url) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()

                    # Fetch tools from MCP
                    result = await session.list_tools()

                    for mcp_tool in result.tools:
                        tool_name = mcp_tool.name
                        tool_desc = mcp_tool.description or "No description provided."
                        input_schema = mcp_tool.inputSchema

                        # Generate Pydantic Model for args_schema
                        fields = _json_schema_to_pydantic_fields(input_schema)

                        # Create dynamic model class
                        # Model name should be unique-ish
                        model_name = f"{tool_name.title().replace('_', '')}Input"

                        DynamicSchema = create_model(
                            model_name, **fields, __base__=BaseModel
                        )

                        # Create CrewAI Tool instance
                        crew_tool = MCPTool(
                            name=tool_name,
                            description=tool_desc,
                            args_schema=DynamicSchema,
                            mcp_tool_name=tool_name,
                        )

                        tools.append(crew_tool)

        except Exception as e:
            print(f"❌ Error fetching MCP tools: {e}")
            # We might want to re-raise or return empty list depending on resilience requirements
            # Returning empty list allows the service to start even if MCP is down (though capabilities will be nil)
            return []

        print(f"✅ Loaded {len(tools)} MCP tools: {[t.name for t in tools]}")
        return tools
