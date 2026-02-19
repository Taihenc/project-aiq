# app/mcp/tools.py
from typing import Optional
from fastmcp import FastMCP
from app.services.service_tools import service_tools
from app.services.qdrant.qdrant_service import qdrant_service
from app.models.models import (
    SearchRequest,
    PageRetrievalRequest,
    ChunkContextRequest,
    PageRetrievalResponse,
    ChunkContextResponse,
)
from app.services.formatter import formatter_service

mcp = FastMCP("embedding-service")


@mcp.tool()
async def greet(name: str) -> str:
    """Greet the user."""
    return f"Hello, {name}! Welcome to embedding-service."


@mcp.tool()
async def search_documents(query: str) -> str:
    """Search for similar documents using semantic search."""
    search_request: SearchRequest = SearchRequest(
        query=query
    )
    response = await service_tools.search_documents(search_request)
    return formatter_service.format_search_response(response)

@mcp.tool()
async def get_pages(file_path: str, start_page: int, end_page: int) -> str:
    """Retrieve pages from a document."""
    request: PageRetrievalRequest = PageRetrievalRequest(
        file_path=file_path,
        start_page=start_page,
        end_page=end_page
    )
    response = await service_tools.get_pages_context(request)
    return formatter_service.format_get_pages_response(file_path, response)

@mcp.tool()
async def get_chunks(file_path: str, chunk_number: int, backward: int, forward: int) -> str:
    """Retrieve context chunks around a specific chunk."""
    request: ChunkContextRequest = ChunkContextRequest(
        file_path=file_path,
        chunk_number=chunk_number,
        backward=backward,
        forward=forward
    )
    response = await service_tools.get_chunks_context(request)
    return formatter_service.format_get_chunks_response(response)


# @mcp.tool()
# async def get_document(doc_id: str) -> dict:
#     """Retrieve a specific document by ID."""
#     return qdrant_service.get_document(doc_id)
