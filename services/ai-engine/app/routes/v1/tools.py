from fastapi import APIRouter
from app.services import ToolService

router = APIRouter()

tool_service = ToolService()


@router.get(f"/")
async def get_tools():
    return tool_service.get_tools()


@router.get("/{tool_id}")
async def get_tool(tool_id: str):
    return tool_service.get_tool(tool_id)
