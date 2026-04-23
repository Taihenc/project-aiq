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
        Grouped by File and Page with full context indicators ([...]) and scores.
        Matches the style of embedding-service/formatter.py exactly.
        """
        # Group by file_path → page_number → chunk_number → data
        files: Dict[str, Dict[int, Dict[int, Dict]]] = {}
        # Global stats per file in this search result set
        file_stats: Dict[str, Dict] = {}

        for idx, doc in enumerate(documents):
            meta = doc.get("metadata") or {}
            file_path = meta.get("file_path", "unknown")
            pages = meta.get("pages") or [0]
            page_number = pages[0]
            chunk_number = meta.get("order", 0)
            text = doc.get("text", "")
            score = doc.get("reranking_score") or doc.get("similarity_score")

            # Update global stats for this search result
            if file_path not in file_stats:
                file_stats[file_path] = {
                    "min_chunk": chunk_number,
                    "max_chunk": chunk_number,
                    "metadata": meta,
                }
            else:
                file_stats[file_path]["min_chunk"] = min(
                    file_stats[file_path]["min_chunk"], chunk_number
                )
                file_stats[file_path]["max_chunk"] = max(
                    file_stats[file_path]["max_chunk"], chunk_number
                )

            files.setdefault(file_path, {})
            files[file_path].setdefault(page_number, {})
            files[file_path][page_number][chunk_number] = {
                "global_index": idx,
                "text": text,
                "score": score,
                "metadata": meta,
            }

        lines = []
        for file_path in sorted(files.keys()):
            stats = file_stats[file_path]
            meta = stats["metadata"]
            max_page = meta.get("max_page", -1)
            max_order = meta.get("max_order", -1)

            lines.append(f"DOCUMENT SOURCE: {file_path}")

            sorted_pages = sorted(files[file_path].keys())

            # 1. Start of Document indicators
            # Page-level check
            if sorted_pages and sorted_pages[0] > 0:
                lines.append(
                    f"  [... Earlier pages (0-{sorted_pages[0] - 1}) not shown ...]"
                )

            # Chunk-level check (if we didn't start at the very first chunk of the file)
            if stats["min_chunk"] > 0:
                # If the first chunk is on the first page we see, we show it here
                lines.append(
                    f"    [... Earlier chunks (0-{stats['min_chunk'] - 1}) not shown ...]"
                )

            last_page = -1
            global_last_chunk = (
                -1
            )  # Keep track across pages to detect gaps at start of page

            for page_num in sorted_pages:
                # 2. Intermediate Pages indicator
                if last_page != -1 and page_num > last_page + 1:
                    skipped_pages = (
                        f"{last_page + 1}-{page_num - 1}"
                        if page_num > last_page + 2
                        else f"{last_page + 1}"
                    )
                    lines.append(
                        f"  [... Intermediate pages ({skipped_pages}) not shown ...]"
                    )

                lines.append(f"  --- PAGE {page_num} ---")

                chunks_in_page = files[file_path][page_num]
                sorted_chunk_nums = sorted(chunks_in_page.keys())

                for chunk_num in sorted_chunk_nums:
                    # 3. Intermediate/Start Chunks in page indicator
                    if global_last_chunk != -1 and chunk_num > global_last_chunk + 1:
                        skipped_chunks = (
                            f"{global_last_chunk + 1}-{chunk_num - 1}"
                            if chunk_num > global_last_chunk + 2
                            else f"{global_last_chunk + 1}"
                        )
                        lines.append(
                            f"    [... Non-relevant chunks ({skipped_chunks}) skipped ...]"
                        )

                    data = chunks_in_page[chunk_num]
                    score_str = (
                        f" (Score: {data['score']:.4f})" if data["score"] else ""
                    )

                    # Make the Reference Index VERY distinct to prevent AI from choosing the Chunk ID
                    lines.append(
                        f"    >>> [REFERENCE INDEX: {data['global_index']}] <<< (Chunk: {chunk_num}){score_str}"
                    )
                    indented_text = data["text"].replace("\n", "\n      ")
                    lines.append(f"      {indented_text}\n")
                    global_last_chunk = chunk_num

                last_page = page_num

            # 4. End of Document indicators
            # Chunk-level check
            if max_order != -1 and stats["max_chunk"] < max_order:
                skipped_tail = (
                    f"{stats['max_chunk'] + 1}-{max_order}"
                    if max_order > stats["max_chunk"] + 1
                    else f"{stats['max_chunk'] + 1}"
                )
                lines.append(
                    f"    [... Remaining chunks ({skipped_tail}) not shown ...]"
                )

            # Page-level check
            if max_page != -1 and last_page < max_page:
                skipped_after = (
                    f"{last_page + 1}-{max_page}"
                    if max_page > last_page + 1
                    else f"{last_page + 1}"
                )
                lines.append(f"  [... Remaining pages ({skipped_after}) not shown ...]")

            lines.append("=" * 60)

        return "\n".join(lines)

    def _intercept_mcp(mcp_output_str: str) -> str:
        """Passthrough logger for non-search tool results (get_pages, get_chunks)."""
        logger.debug(f"[PROXY] Raw MCP Output Result:\n{mcp_output_str}\n{'=' * 40}")
        return mcp_output_str

    @tool("proxy_search_documents")
    def search_documents(query: str) -> str:
        """Search the knowledge base for documents based on a query.
        IMPORTANT: Use the information provided in the search results to answer the user's question.
        Each search result piece is labeled with a ">>> [REFERENCE INDEX: X] <<<".
        When you formulate your final answer, you MUST specify which indices you are using by providing an array of integers representing the REFERENCE INDEXes in your structured output.
        Do NOT use "Chunk ID", "Order", or "Page Number" for selection. ONLY use the value inside [REFERENCE INDEX: X].

        The query MUST be a fully summarized and self-contained question that includes all relevant context from previous conversation history.
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
            if "filter_in" in search_filter:
                params["filter_in"] = search_filter["filter_in"]
            if "filter_out" in search_filter:
                params["filter_out"] = search_filter["filter_out"]
        raw_json_str = run_mcp_sync(
            execute_mcp_operation("search_documents", params, status_callback)
        )

        # Parse structured JSON from embedding service
        try:
            search_data = json.loads(raw_json_str)
            documents = search_data.get("documents", [])

            # Format raw log for better visibility
            formatted_raw = json.dumps(search_data, indent=2, ensure_ascii=False)
            logger.debug(
                f"[PROXY] Pretty Raw MCP search_documents output:\n{formatted_raw}\n{'=' * 60}"
            )
        except (json.JSONDecodeError, TypeError, AttributeError):
            logger.warning(
                "[PROXY] Could not parse search JSON — returning raw output as fallback"
            )
            return raw_json_str

        # Store raw document dicts in state for post-processing index → citation mapping
        if tool_results_store is not None:
            tool_results_store.clear()
            tool_results_store.extend(documents)
            logger.debug(
                f"[PROXY] tool_results_store populated: {len(documents)} docs\n"
                + "\n".join(
                    f"  [{i}] file={d.get('metadata', {}).get('file_path', '?')} "
                    f"page={(d.get('metadata', {}).get('pages') or [0])[0]} "
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
