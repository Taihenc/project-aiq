"""MCP tool definitions and handlers."""

from mcp.server import Server
import mcp.types as types
from services.search import perform_search
from services.pages import retrieve_pages
from services.chunks import retrieve_chunks

# Initialize MCP server
mcp = Server("embedding-search")

@mcp.list_tools()
async def list_tools() -> list[types.Tool]:
    """List available MCP tools."""
    return [
        types.Tool(
            name="search_documents",
            description="Search for documents using the embedding service.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query text."
                    },
                    "top_k": {
                        "type": "integer",
                        "default": 10,
                        "description": "Number of results from semantic search."
                    },
                    "top_n": {
                        "type": "integer",
                        "default": 10,
                        "description": "Number of results from rerank."
                    },
                    "score_threshold": {
                        "type": "number",
                        "default": 0.0,
                        "description": "Minimum similarity score."
                    }
                },
                "required": ["query"]
            }
        ),
        types.Tool(
            name="retrieve_pages",
            description="Retrieve pages from a document by file path and page range.",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "File path of the document."
                    },
                    "start_page": {
                        "type": "integer",
                        "description": "Starting page index."
                    },
                    "end_page": {
                        "type": "integer",
                        "description": "Ending page index."
                    }
                },
                "required": ["file_path", "start_page", "end_page"]
            }
        ),
        types.Tool(
            name="retrieve_chunks",
            description="Retrieve surrounding chunks using a chunk ID.",
            inputSchema={
                "type": "object",
                "properties": {
                    "chunk_id": {
                        "type": "string",
                        "description": "Target chunk ID."
                    },
                    "backward": {
                        "type": "integer",
                        "default": 2,
                        "description": "Number of chunks before the target chunk."
                    },
                    "forward": {
                        "type": "integer",
                        "default": 2,
                        "description": "Number of chunks after the target chunk."
                    }
                },
                "required": ["chunk_id"]
            }
        ),
    ]


@mcp.call_tool()
async def call_tool(
    name: str,
    arguments: dict
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle MCP tool calls."""

    if name == "search_documents":
        query = arguments.get("query")
        top_k = arguments.get("top_k", 10)
        top_n = arguments.get("top_n", 10)
        score_threshold = arguments.get("score_threshold", 0.0)

        result = await perform_search(query, top_k, top_n, score_threshold)
        return [types.TextContent(type="text", text=result)]

    if name == "retrieve_pages":
        file_path = arguments.get("file_path")
        start_page = arguments.get("start_page")
        end_page = arguments.get("end_page")

        result = await retrieve_pages(file_path, start_page, end_page)
        return [types.TextContent(type="text", text=result)]

    if name == "retrieve_chunks":
        chunk_id = arguments.get("chunk_id")
        backward = arguments.get("backward", 2)
        forward = arguments.get("forward", 2)

        result = await retrieve_chunks(chunk_id, backward, forward)
        return [types.TextContent(type="text", text=result)]

    raise ValueError(f"Unknown tool: {name}")

