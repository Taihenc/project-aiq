from typing import Dict, List, Optional
from fastapi import HTTPException
from crewai.tools import BaseTool
from app.models.tools import ToolConfig
from app.schemas.base import BaseResponse
from app.config.tools import TOOLS


class ToolService:
    """Service for managing tools."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = TOOLS

    # ============================================================================
    # Tool Config Operations
    # ============================================================================

    def get_tools_config(self) -> BaseResponse:
        try:
            tool_configs = [
                ToolConfig(name=tool.name, description=tool.description)
                for tool in self._tools.values()
            ]
            # Transform list of ToolConfig to dict keyed by name for consistency with examples
            configs_dict = {
                cfg.name: {"name": cfg.name, "description": cfg.description}
                for cfg in tool_configs
            }
            return BaseResponse(
                success=True,
                message="Tool configs fetched successfully",
                data={"configs": configs_dict, "count": len(configs_dict)},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def get_tool_config(self, tool: str) -> BaseResponse:
        try:
            tool_instance = self._tools.get(tool)
            if not tool_instance:
                raise HTTPException(status_code=404, detail=f"Tool '{tool}' not found")
            config = ToolConfig(
                name=tool_instance.name,
                description=tool_instance.description,
            )
            return BaseResponse(
                success=True,
                message="Tool config fetched successfully",
                data={
                    "config": {"name": config.name, "description": config.description}
                },
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    # ============================================================================
    # Tool Instance Operations
    # ============================================================================

    def get_tool(self, tool: str) -> Optional[BaseTool]:
        return self._tools.get(tool)

    def get_tools(self, tools: List[str]) -> List[BaseTool]:
        return [self._tools.get(tool) for tool in tools]
