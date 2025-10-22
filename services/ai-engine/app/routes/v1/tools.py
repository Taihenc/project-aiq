from fastapi import APIRouter, HTTPException, Path
from app.services import ToolService
from app.schemas import BaseResponse

router = APIRouter(prefix="/tools", tags=["tools"])

tool_service = ToolService()


@router.get(
    "/",
    response_model=BaseResponse,
    summary="Get All Available Tool Configurations",
    description="Retrieve all available tool configurations in the system with their details",
    responses={
        200: {
            "description": "Successfully retrieved tool configurations list",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Tool configs fetched successfully",
                        "data": {
                            "configs": {
                                "web_search": {
                                    "name": "web_search",
                                    "description": "Search the web for information",
                                },
                                "document_search": {
                                    "name": "document_search",
                                    "description": "Search internal documents and knowledge base",
                                },
                            },
                            "count": 2,
                        },
                    }
                }
            },
        }
    },
)
async def get_tools_config():
    configs = tool_service.get_tools_config()
    # Transform list of ToolConfig to dict keyed by name for consistency with examples
    configs_dict = {
        cfg.name: {"name": cfg.name, "description": cfg.description} for cfg in configs
    }
    return BaseResponse(
        success=True,
        message="Tool configs fetched successfully",
        data={
            "configs": configs_dict,
            "count": len(configs_dict),
        },
    )


@router.get(
    "/{tool}",
    response_model=BaseResponse,
    summary="Get Specific Tool Configuration",
    description="Retrieve configuration details for a specific tool",
    responses={
        200: {
            "description": "Successfully retrieved tool configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Tool config fetched successfully",
                        "data": {
                            "config": {
                                "name": "web_search",
                                "description": "Search the web for information",
                            }
                        },
                    }
                }
            },
        },
        404: {
            "description": "Tool not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Tool 'web_search' not found"}
                }
            },
        },
    },
)
async def get_tool_config(
    tool: str = Path(
        ...,
        description="Name of the tool to retrieve configuration for",
        example="document_search",
        min_length=1,
        max_length=50,
    )
):
    config = tool_service.get_tool_config(tool)
    if not config:
        raise HTTPException(status_code=404, detail=f"Tool '{tool}' not found")
    return BaseResponse(
        success=True,
        message="Tool config fetched successfully",
        data={
            "config": {
                "name": config.name,
                "description": config.description,
            },
        },
    )
