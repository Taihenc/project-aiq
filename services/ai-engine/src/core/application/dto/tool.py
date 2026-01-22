from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, ConfigDict


from datetime import datetime


class CreateToolRequest(BaseModel):
    name: str
    description: str
    type: Literal["REST", "MCP_SSE"]
    endpoint: str
    auth_config: Dict[str, Any] = {}
    parameters: Optional[Dict[str, str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "weather_api",
                "description": "Get current weather in a city",
                "type": "REST",
                "endpoint": "https://api.weather.com/v1/forecast",
                "auth_config": {"api_key": "YOUR_SECRET_KEY"},
                "parameters": {"city": "str", "days": "int"},
            }
        }
    )


class UpdateToolRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[Literal["REST", "MCP_SSE"]] = None
    endpoint: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "weather_api",
                "description": "Get current weather in a city",
                "type": "REST",
                "endpoint": "https://api.weather.com/v1/forecast",
                "auth_config": {"api_key": "YOUR_SECRET_KEY"},
                "parameters": {"city": "str", "days": "int"},
            }
        }
    )
