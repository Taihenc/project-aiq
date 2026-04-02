from typing import List, Callable, Optional
from crewai.tools import tool
from crewai import Crew
from loguru import logger
from src.config.settings import settings
from src.services.crew.agents import create_hyde_agent
from src.services.crew.tasks import create_hyde_task
from src.services.crew.tools.mcp_service import execute_mcp_operation, run_mcp_sync
from langfuse import observe


@observe(name="generate_hyde", as_type="generation")
def generate_hyde_answer(query: str, status_callback: Optional[Callable] = None) -> str:
    """Generate a hypothetical answer using a dedicated CrewAI agent."""
    if status_callback:
        status_callback("Generating hypothetical answer (HyDE)...")

    try:
        hyde_agent = create_hyde_agent()
        hyde_task = create_hyde_task(hyde_agent, query)

        hyde_crew = Crew(
            agents=[hyde_agent],
            tasks=[hyde_task],
            verbose=settings.crew_hyde_verbose,
        )

        result = hyde_crew.kickoff()

        if not result.pydantic:
            logger.warning("HyDE returned no Pydantic model. Falling back to raw text.")
            hyde_answer = str(result.raw).strip()
            if status_callback:
                status_callback("Hypothetical answer generated.")
            enhanced_query = f"{query}\n{hyde_answer}"
        else:
            hyde_data = result.pydantic
            if status_callback:
                status_callback(f'Hypothetical answer generated: "{hyde_data.title}"')
            enhanced_query = f"{query}\n{hyde_data.query}"

        logger.info(f"HyDE Enhanced Query: {enhanced_query}")
        return enhanced_query
    except Exception as e:
        logger.error(f"Error generating HyDE answer via CrewAI: {e}")
        return query


def get_proxy_tools(status_callback: Optional[Callable] = None) -> List:
    """
    Creates and returns a list of proxy tools bound to the given status callback.

    Each proxy acts as a middleware between CrewAI Agent and MCP Tool:
    - Agent sees the PROXY signature (can differ from MCP tool params)
    - Proxy builds the actual params dict and calls the MCP tool
    """

    @tool("proxy_search_documents")
    @observe(name="search_documents", as_type="generation")
    def search_documents(query: str) -> str:
        """Search the knowledge base for documents based on a query."""
        enhanced_query = generate_hyde_answer(query, status_callback)
        return run_mcp_sync(
            execute_mcp_operation(
                "search_documents", {"query": enhanced_query}, status_callback
            )
        )

    @tool("proxy_get_pages")
    @observe(name="get_pages", as_type="generation")
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
    @observe(name="get_chunks", as_type="generation")
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
