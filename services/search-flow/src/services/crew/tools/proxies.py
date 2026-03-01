from typing import List, Callable, Optional
from crewai.tools import tool
from src.services.crew.tools.mcp_service import execute_mcp_operation, run_mcp_sync


def get_proxy_tools(status_callback: Optional[Callable] = None) -> List:
    """
    Creates and returns a list of proxy tools bound to the given status callback.
    """

    @tool("proxy_search_documents")
    def search_documents(query: str) -> str:
        """Search the knowledge base for documents based on a query."""
        params = {"query": query}
        return run_mcp_sync(
            execute_mcp_operation("search_documents", params, status_callback)
        )

    @tool("proxy_get_pages")
    def get_pages(file_path: str, page_numbers: list[int]) -> str:
        """Get specific pages from a known file path."""
        params = {"file_path": file_path, "page_numbers": page_numbers}
        return run_mcp_sync(execute_mcp_operation("get_pages", params, status_callback))

    @tool("proxy_get_chunks")
    def get_chunks(file_path: str, chunk_numbers: list[int]) -> str:
        """Get specific text chunks from a known file path."""
        params = {"file_path": file_path, "chunk_numbers": chunk_numbers}
        return run_mcp_sync(
            execute_mcp_operation("get_chunks", params, status_callback)
        )

    return [search_documents, get_pages, get_chunks]
