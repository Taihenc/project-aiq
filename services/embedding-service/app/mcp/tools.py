# app/mcp/tools.py
from typing import Optional, List
from fastmcp import FastMCP
from app.services.service_tools import service_tools
from app.services.qdrant.qdrant_service import qdrant_service
from app.models.models import (
    SearchRequest,
    PageRetrievalRequest,
    ChunkContextRequest,
    PageRetrievalResponse,
    ChunkContextResponse,
    FilterIn,
    FilterOut
)
from app.services.formatter import formatter_service

mcp = FastMCP("embedding-service")


@mcp.tool()
async def greet(name: str) -> str:
    """
    Greet the user.
    
    PROMPT INSTRUCTIONS FOR LLM:
    - Use this tool to test the MCP connection or when explicitly asked to greet the user.
    - Keep greetings friendly and concise.
    
    USAGE INSTRUCTIONS:
    - `name`: A string name representing the user (e.g., "Alice").
    """
    return f"Hello, {name}! Welcome to embedding-service."


@mcp.tool()
async def search_documents(
    query: str, 
    top_k: int = 10, 
    top_n: int = 5, 
    filter_in: Optional[FilterIn] = None, 
    filter_out: Optional[FilterOut] = None
) -> str:
    """
    Search for similar documents using semantic search.
    
    PROMPT INSTRUCTIONS FOR LLM:
    - ALWAYS use this tool as the first step when the user asks a question about the knowledge base or requests information on a topic.
    - Formulate the `query` as concise keywords rather than full sentences to maximize semantic similarity matches.
    - If this tool does not provide enough continuous context to answer the question, follow up with `get_pages` or `get_chunks` using the returned file path or chunk details.
    
    USAGE INSTRUCTIONS:
    - `query`: Extract the core entities and topics into keywords.
    """
    search_request: SearchRequest = SearchRequest(
        query=query,
        top_k=top_k,
        top_n=top_n,
        filter_in=filter_in,
        filter_out=filter_out
    ) 
    response = await service_tools.search_documents(search_request)
    # Return structured JSON — the search-flow proxy handles formatting with index numbers
    return response.model_dump_json()


@mcp.tool()
async def get_pages(file_path: str, start_page: int, end_page: int) -> str:
    """
    Retrieve pages from a document.
    
    PROMPT INSTRUCTIONS FOR LLM:
    - Use this tool when you need to read entire, contiguous pages from a specific document.
    - This is ideal when the user asks to summarize a section, read a specific page, or when `search_documents` does not provide enough surrounding context.
    - The `file_path` must exactly match the document path returned from previous searches.
    
    USAGE INSTRUCTIONS:
    - `file_path`: A string representing the exact path of the document.
    - `start_page`: Integer of the starting page to retrieve (pages are generally 1-indexed).
    - `end_page`: Integer of the ending page to retrieve (inclusive). Set to the same as `start_page` to retrieve a single page.
    """
    request: PageRetrievalRequest = PageRetrievalRequest(
        file_path=file_path, start_page=start_page, end_page=end_page
    )
    response = await service_tools.get_pages_context(request)
    return formatter_service.format_get_pages_response(file_path, response)


@mcp.tool()
async def get_chunks(
    file_path: str, chunk_number: int, backward: int, forward: int
) -> str:
    """
    Retrieve context chunks around a specific chunk.
    
    PROMPT INSTRUCTIONS FOR LLM:
    - Use this tool to get the immediate preceding (backward) or succeeding (forward) text around a specific chunk.
    - This is useful when `search_documents` returns a highly relevant chunk, but you need the sentences right before or after it to fully comprehend the context.
    - Keep `backward` and `forward` values small (e.g., 1 to 3) to retrieve just the immediate context. Use `get_pages` if you need large-scale reading.
    
    USAGE INSTRUCTIONS:
    - `file_path`: Exact string path of the document.
    - `chunk_number`: Integer index of the target chunk you want context around.
    - `backward`: Integer specifying how many chunks before the designated chunk to return.
    - `forward`: Integer specifying how many chunks after the designated chunk to return.
    """
    request: ChunkContextRequest = ChunkContextRequest(
        file_path=file_path,
        chunk_number=chunk_number,
        backward=backward,
        forward=forward,
    )
    response = await service_tools.get_chunks_context(request)
    return formatter_service.format_get_chunks_response(response)


# @mcp.tool()
# async def get_document(doc_id: str) -> dict:
#     """Retrieve a specific document by ID."""
#     return qdrant_service.get_document(doc_id)
