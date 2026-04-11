import json
from typing import List, Callable, Optional, Dict, Any
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
            verbose=settings.verbose,
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


def get_proxy_tools(
    status_callback: Optional[Callable] = None,
    search_filter: Optional[dict] = None,
    tool_results_store: Optional[list] = None,
) -> List:
    """
    Creates and returns a list of proxy tools bound to the given status callback.

    Each proxy acts as a middleware between CrewAI Agent and MCP Tool.
    """

    def _format_search_results_with_indices(documents: List[Dict[str, Any]]) -> str:
        """
        Format search result documents with [index] numbers for AI selection.
        Adapted from embedding-service formatter.py — groups by file → page → chunk.
        The AI uses the [index] numbers to indicate which results it referenced.
        """
        # Group by file_path → page_number → list of chunks
        files: Dict[str, Dict[int, List[Dict]]] = {}
        for idx, doc in enumerate(documents):
            meta = doc.get("metadata") or {}
            file_path = meta.get("file_path", "unknown")
            page_number = (meta.get("pages") or [0])[0]
            chunk_number = meta.get("order", 0)
            text = doc.get("text", "")
            score = doc.get("reranking_score") or doc.get("similarity_score")

            files.setdefault(file_path, {})
            files[file_path].setdefault(page_number, [])
            files[file_path][page_number].append({
                "global_index": idx,
                "chunk_number": chunk_number,
                "text": text,
                "score": score,
            })

        lines = []
        for file_path in sorted(files.keys()):
            lines.append(f"File: {file_path}")
            for page_number in sorted(files[file_path].keys()):
                lines.append(f"\tPage: {page_number}")
                chunks = sorted(files[file_path][page_number], key=lambda c: c["chunk_number"])
                for chunk in chunks:
                    score_str = f" (Score: {chunk['score']:.4f})" if chunk["score"] is not None else ""
                    lines.append(f"\t\t[{chunk['global_index']}] Chunk: {chunk['chunk_number']}{score_str}")
                    indented_text = chunk["text"].replace("\n", "\n\t\t\t")
                    lines.append(f"\t\t\t{indented_text}")

        return "\n".join(lines)

    def _intercept_mcp(mcp_output_str: str) -> str:
        """Passthrough logger for non-search tool results (get_pages, get_chunks)."""
        logger.debug(f"[PROXY] Raw MCP Output Result:\n{mcp_output_str}\n{'=' * 40}")
        return mcp_output_str

    @tool("proxy_search_documents")
    def search_documents(query: str) -> str:
        """Search the knowledge base for documents based on a query.
        IMPORTANT: The query MUST be a fully summarized and self-contained question that includes all relevant context from previous conversation history.
        If the user mentions a specific proper noun, technical term, or project name, you MUST understand it and briefly explain what it is within the query.
        If you DO NOT know what the specific term refers to, DO NOT use this tool. Instead, reply to the user and ask them to clarify what that term means.
        Do NOT just pass the user's latest message verbatim, as the underlying generate_hyde_answer and search engine do not have access to conversation history.
        CRITICAL CONSTRAINT: Do NOT rely on "Attachments" to skip searching. You MUST trigger this tool to fetch fresh content if the intent is to search.
        """
        enhanced_query = generate_hyde_answer(query, status_callback)
        params: dict = {
            "query": enhanced_query,
            "top_k": settings.search_top_k,
            "top_n": settings.search_top_n,
        }
        if search_filter:
            params["filter"] = search_filter
        raw_json_str = run_mcp_sync(
            execute_mcp_operation("search_documents", params, status_callback)
        )

        logger.debug(f"[PROXY] Raw MCP search_documents output:\n{raw_json_str}\n{'=' * 40}")

        # Parse structured JSON from embedding service
        try:
            search_data = json.loads(raw_json_str)
            documents = search_data.get("documents", [])
        except (json.JSONDecodeError, TypeError, AttributeError):
            logger.warning("[PROXY] Could not parse search JSON — returning raw output as fallback")
            return raw_json_str

        # Store raw document dicts in state for post-processing index → citation mapping
        if tool_results_store is not None:
            tool_results_store.clear()
            tool_results_store.extend(documents)
            logger.debug(
                f"[PROXY] tool_results_store populated: {len(documents)} docs\n"
                + "\n".join(
                    f"  [{i}] file={d.get('metadata', {}).get('file_path', '?')} "
                    f"page={( d.get('metadata', {}).get('pages') or [0])[0]} "
                    f"chunk={d.get('metadata', {}).get('order', '?')}"
                    for i, d in enumerate(documents)
                )
            )

        # Format with [index] numbers so AI can reference results by index
        return _format_search_results_with_indices(documents)

    @tool("proxy_get_pages")
    def get_pages(file_path: str, start_page: int, end_page: int) -> str:
        """Retrieve pages from a document by specifying a page range.
        CRITICAL CONSTRAINT: The user query MUST contain the specific file path AND page number required. You MUST know BOTH to proceed. If missing, ask the user.
        """
        # MCP params: file_path (str), start_page (int), end_page (int)
        params = {
            "file_path": file_path,
            "start_page": start_page,
            "end_page": end_page,
        }
        res = run_mcp_sync(execute_mcp_operation("get_pages", params, status_callback))
        return _intercept_mcp(res)

    @tool("proxy_get_chunks")
    def get_chunks(
        file_path: str, chunk_number: int, backward: int, forward: int
    ) -> str:
        """Retrieve context chunks around a specific chunk number.
        CRITICAL CONSTRAINT: The user query MUST contain the specific file path AND chunk number required. You MUST know BOTH to proceed. If missing, ask the user.
        """
        # MCP params: file_path (str), chunk_number (int), backward (int), forward (int)
        params = {
            "file_path": file_path,
            "chunk_number": chunk_number,
            "backward": backward,
            "forward": forward,
        }
        res = run_mcp_sync(execute_mcp_operation("get_chunks", params, status_callback))
        return _intercept_mcp(res)

    return [search_documents, get_pages, get_chunks]
