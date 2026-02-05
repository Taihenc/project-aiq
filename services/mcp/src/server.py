"""FastAPI server for MCP over SSE."""

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from starlette.routing import Route
from mcp.server.sse import SseServerTransport
import uvicorn

from mcp_tools import mcp
from config import settings


# Initialize FastAPI app
app = FastAPI(
    title="MCP Server",
    version="1.0.0",
    description="MCP server for searching documents via embedding service"
)

# Initialize SSE transport
sse = SseServerTransport("/messages")


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to Swagger docs."""
    return RedirectResponse(url="/docs")


@app.get("/sse", tags=["MCP"], summary="Server-Sent Events Endpoint", response_class=RedirectResponse)
async def handle_sse(request: Request):
    """
    Connect to the MCP server via SSE.
    """
    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
        await mcp.run(streams[0], streams[1], mcp.create_initialization_options())


class MessagesEndpoint:
    """ASGI endpoint for handling MCP messages."""
    async def __call__(self, scope, receive, send):
        await sse.handle_post_message(scope, receive, send)


# Define the route with FastAPI to generate OpenAPI docs
@app.post("/messages", tags=["MCP"], summary="JSON-RPC Message Endpoint",
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "jsonrpc": {"type": "string", "example": "2.0"},
                            "method": {"type": "string", "example": "tools/call"},
                            "params": {"type": "object"},
                            "id": {"type": "integer", "example": 1}
                        },
                        "required": ["jsonrpc", "method", "params", "id"]
                    }
                }
            },
            "required": True
        }
    }
)
async def handle_messages(request: Request, session_id: str):
    """
    Send JSON-RPC messages to the MCP server.
    
    **Note:** You must provide the `session_id` obtained from the `/sse` endpoint.
    """
    # This function is just for documentation. 
    # The actual handler is swapped below to be the raw ASGI app.
    pass


# Swap the handler to the raw ASGI app to avoid FastAPI response wrapping issues
for route in app.routes:
    if isinstance(route, Route) and route.path == "/messages":
        route.app = MessagesEndpoint()
        break


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=settings.server_port,
        reload=True,
        reload_dirs=["src"]
    )
