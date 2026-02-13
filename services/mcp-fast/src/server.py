"""FastMCP server for embedding search and retrieval."""

from fastmcp import FastMCP
from config import settings
from services.search import perform_search
from services.pages import retrieve_pages
from services.chunks import retrieve_chunks

# Initialize FastMCP server
mcp = FastMCP("embedding-search")

@mcp.tool(
    name="search_documents",
    description="Search for documents using the embedding service."
)
async def search_documents_tool(
    query: str,
    top_k: int = 10,
    top_n: int = 10,
    score_threshold: float = 0.0,
) -> str:
    """
    Search for documents.

    Args:
        query: The search query text.
        top_k: Number of results from semantic search.
        top_n: Number of results from rerank.
        score_threshold: Minimum similarity score.
    """
    return await perform_search(query, top_k, top_n, score_threshold)


@mcp.tool(
    name="retrieve_pages",
    description="Retrieve pages from a document by file path and page range."
)
async def retrieve_pages_tool(
    file_path: str,
    start_page: int,
    end_page: int,
) -> str:
    """
    Retrieve pages from a document.

    Args:
        file_path: File path of the document.
        start_page: Starting page index.
        end_page: Ending page index.
    """
    return await retrieve_pages(file_path, start_page, end_page)


@mcp.tool(
    name="retrieve_chunks",
    description="Retrieve surrounding chunks using a chunk ID."
)
async def retrieve_chunks_tool(
    chunk_id: str,
    backward: int = 2,
    forward: int = 2,
) -> str:
    """
    Retrieve surrounding chunks.

    Args:
        chunk_id: Target chunk ID.
        backward: Number of chunks before the target chunk.
        forward: Number of chunks after the target chunk.
    """
    return await retrieve_chunks(chunk_id, backward, forward)


if __name__ == "__main__":
    mcp.run(transport="sse", host="0.0.0.0", port=settings.server_port)
