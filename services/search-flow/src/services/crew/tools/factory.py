import asyncio
from typing import List, Dict, Any, Type, Optional, Callable
from pydantic import BaseModel, create_model, Field
from mcp import ClientSession
from mcp.client.sse import sse_client
from src.config.settings import settings
from src.services.crew.tools.mcp import MCPTool


# Robust JSON Schema to Pydantic Converter
def _create_pydantic_model_from_schema(
    schema: Dict[str, Any], model_name: str
) -> Type[BaseModel]:
    """
    Recursively converts a JSON Schema to a dynamic Pydantic model.
    Handles nested objects, arrays, and standard types.
    """
    json_type = schema.get("type", "object")

    # 1. Handle Objects (Recursive)
    if json_type == "object":
        fields = {}
        properties = schema.get("properties", {})
        required_fields = set(schema.get("required", []))

        for field_name, field_schema in properties.items():
            field_type = str
            field_default = ...  # Required by default

            # Determine Type (Recursive)
            if field_schema.get("type") == "object":
                # Create nested model
                nested_model_name = (
                    f"{model_name}_{field_name.title().replace('_', '')}"
                )
                field_type = _create_pydantic_model_from_schema(
                    field_schema, nested_model_name
                )
            elif field_schema.get("type") == "array":
                # Handle Arrays
                items_schema = field_schema.get("items", {})
                item_type = str  # Default fallback
                if items_schema.get("type") == "object":
                    nested_item_name = f"{model_name}_{field_name}_Item"
                    item_type = _create_pydantic_model_from_schema(
                        items_schema, nested_item_name
                    )
                else:
                    item_type = _get_python_type(items_schema.get("type", "string"))
                field_type = List[item_type]
            else:
                # Basic Types
                field_type = _get_python_type(field_schema.get("type", "string"))

            # Determine Optionality/Default
            if field_name not in required_fields:
                field_default = None  # Make it optional
                # Update type hint to Optional if not already (Pydantic handles Optional via default=None usually, but explicit is better)
                # For dynamic creation, default=None makes it optional in validation.

            # Extract description
            description = field_schema.get("description", "")

            fields[field_name] = (
                field_type,
                Field(default=field_default, description=description),
            )

        return create_model(model_name, **fields, __base__=BaseModel)

    # Fallback for non-object top-level schemas (unlikely for Tool args, but possible)
    return create_model(model_name, __base__=BaseModel)  # Empty model as fallback


def _get_python_type(json_type: str) -> Type:
    type_mapping = {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "array": list,
        "object": dict,
    }
    return type_mapping.get(json_type, str)


class MCPToolFactory:
    @staticmethod
    async def get_tools(status_callback: Optional[Callable] = None) -> List[MCPTool]:
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

                        # Generate Pydantic Model for args_schema (Robust & Recursive)
                        model_name = f"{tool_name.title().replace('_', '')}Input"
                        DynamicSchema = _create_pydantic_model_from_schema(
                            input_schema, model_name
                        )

                        # Create CrewAI Tool instance
                        crew_tool = MCPTool(
                            name=tool_name,
                            description=tool_desc,
                            args_schema=DynamicSchema,
                            mcp_tool_name=tool_name,
                            status_callback=status_callback,
                        )

                        tools.append(crew_tool)

        except Exception as e:
            print(f"❌ Error fetching MCP tools: {e}")
            # We might want to re-raise or return empty list depending on resilience requirements
            # Returning empty list allows the service to start even if MCP is down (though capabilities will be nil)
            return []

        print(f"✅ Loaded {len(tools)} MCP tools: {[t.name for t in tools]}")
        return tools
