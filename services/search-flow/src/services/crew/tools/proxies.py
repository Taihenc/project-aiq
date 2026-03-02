from typing import List, Callable, Optional
from crewai.tools import tool
from src.services.crew.tools.mcp_service import execute_mcp_operation, run_mcp_sync


def get_proxy_tools(status_callback: Optional[Callable] = None) -> List:
    """
    Creates and returns a list of proxy tools bound to the given status callback.

    Each proxy acts as a middleware between CrewAI Agent and MCP Tool:
    - Agent sees the PROXY signature (can differ from MCP tool params)
    - Proxy builds the actual params dict and calls the MCP tool

    Customization examples (apply to any proxy below):

        # Example 1: Override/inject params that the agent doesn't need to know
        # params["some_internal_key"] = get_value_from_config()

        # Example 2: Transform agent input before sending to MCP
        # params["query"] = f"{query} filter:active"

        # Example 3: Run extra logic before calling the MCP tool
        # log_tool_usage(tool_name, params)
        # validate_input(params)
    """

    @tool("proxy_search_documents")
    def search_documents(query: str) -> str:
        """Search the knowledge base for documents based on a query."""
        # MCP params: query (str)
        params = {"query": query}
        return run_mcp_sync(
            execute_mcp_operation("search_documents", params, status_callback)
        )

    @tool("proxy_get_pages")
    def get_pages(file_path: str, start_page: int, end_page: int) -> str:
        """Retrieve pages from a document by specifying a page range."""
        # MCP params: file_path (str), start_page (int), end_page (int)
        params = {
            "file_path": file_path,
            "start_page": start_page,
            "end_page": end_page,
        }
        return run_mcp_sync(execute_mcp_operation("get_pages", params, status_callback))

    @tool("proxy_get_chunks")
    def get_chunks(
        file_path: str, chunk_number: int, backward: int, forward: int
    ) -> str:
        """Retrieve context chunks around a specific chunk number."""
        # MCP params: file_path (str), chunk_number (int), backward (int), forward (int)
        params = {
            "file_path": file_path,
            "chunk_number": chunk_number,
            "backward": backward,
            "forward": forward,
        }
        return run_mcp_sync(
            execute_mcp_operation("get_chunks", params, status_callback)
        )

    return [search_documents, get_pages, get_chunks]
