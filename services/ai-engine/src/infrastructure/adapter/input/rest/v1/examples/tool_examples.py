from typing import Dict, Any

LIST_TOOLS_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully retrieved tool list",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": [
                        {
                            "id": "tool_01",
                            "name": "weather_api",
                            "description": "Get current weather",
                            "type": "REST",
                            "endpoint": "https://api.weather.com",
                            "created_at": "2024-01-20T10:00:00Z",
                        }
                    ],
                    "message": "Tools retrieved successfully",
                }
            }
        },
    }
}

GET_TOOL_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully retrieved tool information",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "tool_01",
                        "name": "weather_api",
                        "description": "Get current weather",
                        "type": "REST",
                        "endpoint": "https://api.weather.com",
                        "created_at": "2024-01-20T10:00:00Z",
                    },
                    "message": "Tool retrieved successfully",
                }
            }
        },
    },
    404: {
        "description": "Tool not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "RESOURCE_NOT_FOUND",
                    "message": "Tool not found: tool_01",
                }
            }
        },
    },
}

CREATE_TOOL_RESPONSES: Dict[int, Dict[str, Any]] = {
    201: {
        "description": "Successfully created tool",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "tool_01",
                        "name": "weather_api",
                        "description": "Get current weather",
                        "type": "REST",
                        "endpoint": "https://api.weather.com",
                        "created_at": "2024-01-20T10:00:00Z",
                    },
                    "message": "Tool created successfully",
                }
            }
        },
    }
}

UPDATE_TOOL_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully updated tool",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "tool_01",
                        "name": "weather_api_updated",
                        "description": "New description",
                        "type": "REST",
                        "endpoint": "https://api.weather.v2.com",
                    },
                    "message": "Tool updated successfully",
                }
            }
        },
    }
}

DELETE_TOOL_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully deleted tool",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": True,
                    "message": "Tool deleted successfully",
                }
            }
        },
    }
}
