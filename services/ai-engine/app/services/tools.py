from typing import Dict, List, Optional
from crewai.tools import BaseTool
from app.models import ToolConfig
from app.config import settings


class ToolService:
    """Service for managing tools."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = settings.TOOLS

    # ============================================================================
    # Tool Config Operations
    # ============================================================================

    def get_tools_config(self) -> List[ToolConfig]:
        tool_config = [
            ToolConfig(name=tool.name, description=tool.description)
            for tool in self._tools.values()
        ]
        return tool_config

    def get_tool_config(self, tool: str) -> Optional[ToolConfig]:
        tool_instance = self._tools.get(tool)
        if not tool_instance:
            return None
        return ToolConfig(
            name=tool_instance.name,
            description=tool_instance.description,
        )

    # ============================================================================
    # Tool Instance Operations
    # ============================================================================

    def get_tool(self, tool: str) -> Optional[BaseTool]:
        return self._tools.get(tool)

    def get_tools(self, tools: List[str]) -> List[BaseTool]:
        return [self._tools.get(tool) for tool in tools]
