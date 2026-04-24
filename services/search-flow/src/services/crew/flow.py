import json
from datetime import datetime
from typing import List, Optional

from loguru import logger
from crewai.flow.flow import Flow, start
from crewai import Crew

from src.config.settings import settings
from src.models.state import AISearchResponse, ChatResponse, FlowState, SearchResponse
from src.models.search import ChunkMetadata, FileRef
from src.services.crew.agents import create_search_agent
from src.services.crew.tasks import create_task
from src.services.crew.status_reporter import FlowStatusReporter
from src.services.crew.tools.proxies import get_proxy_tools


class SearchCrewFlow(Flow[FlowState]):
    def __init__(self, step_callback=None, llm_callbacks=None, stream_llm: bool = True):
        super().__init__()
        self.reporter = FlowStatusReporter(step_callback)
        self.llm_callbacks = llm_callbacks
        self.stream_llm = stream_llm

    # ── Context formatting helpers ──────────────────────────────────

    def _format_context(self) -> str:
        """Helper to format structured context for LLM prompts."""
        if not self.state.context:
            return ""
        return (
            f"- **Reference Data (Attachments - Provided by USER):**\n"
            f"NOTE: These files were attached by the user. They are NOT search results. "
            f"Use them to answer, but DO NOT include them in the 'citations' output field.\n"
            f"{self.state.context}\n"
        )

    def _format_history(self) -> str:
        """Helper to format chat history for LLM prompts."""
        if not self.state.history:
            return ""
        return f"- **Conversation Record (History):**\n{json.dumps(self.state.history, indent=2, ensure_ascii=False)}\n"

    def _build_context_block(self) -> str:
        """Build the context block string for the prompt (pure formatting, no side-effects)."""
        formatted_context = self._format_context()
        formatted_history = self._format_history()

        if not (formatted_context or formatted_history or self.state.title):
            return ""

        context_block = "# CONTEXT (Current Environment & Data)\n"

        if self.state.title:
            context_block += (
                f"- **Current Conversation Title:** {self.state.title}\n"
            )

        context_block += (formatted_context + "\n") if formatted_context else "- No attachments provided.\n"
        context_block += (formatted_history + "\n") if formatted_history else "- No chat history.\n"

        return context_block

    def _report_context_and_history(self):
        """Emit status reports about context and history — separated from building."""
        self.reporter.report_context(self.state.context)
        self.reporter.report_history(self.state.history)

    # ── Tool selection ──────────────────────────────────────────────

    def _select_tools_for_mode(self, mode: str, all_tools: List) -> List:
        """Return the subset of proxy tools appropriate for the given mode."""
        search_documents_proxy, get_pages_proxy, get_chunks_proxy = all_tools

        mode_tool_map = {
            "auto": [search_documents_proxy, get_pages_proxy, get_chunks_proxy],
            "search": [search_documents_proxy],
            "lookup": [get_pages_proxy, get_chunks_proxy],
            "chat": [],
        }
        return mode_tool_map.get(mode, [])

    # ── Citation resolution ─────────────────────────────────────────

    def _resolve_citations(self, ai_response: AISearchResponse) -> Optional[List[FileRef]]:
        """
        Map AI-selected indices back to actual FileRef citations using the
        raw documents stored in tool_results_store during the search tool call.
        Returns None if no valid selection or no store available.
        """
        store = self.state.tool_results_store
        selected = ai_response.selected_indices

        logger.debug(
            f"[FLOW] _resolve_citations called | "
            f"store_size={len(store)} | selected_indices={selected}"
        )

        if not selected or not store:
            logger.warning(
                f"[FLOW] _resolve_citations early return | "
                f"selected={selected!r} | store_empty={not store}"
            )
            return None

        # Build file_path → page_number → chunks mapping from selected indices
        file_map: dict = {}
        for idx in selected:
            if not (0 <= idx < len(store)):
                logger.warning(f"[FLOW] AI selected out-of-range index {idx} (store size={len(store)}), skipping")
                continue

            doc = store[idx]
            meta = doc.get("metadata") or {}
            file_path = meta.get("file_path", "unknown")
            file_id = meta.get("file_id") or None
            page_number = (meta.get("pages") or [0])[0]
            chunk_number = meta.get("order", 0)
            score = doc.get("reranking_score") or doc.get("similarity_score")
            content = doc.get("text")

            if file_path not in file_map:
                file_map[file_path] = {"file_id": file_id, "pages": {}}
            if page_number not in file_map[file_path]["pages"]:
                file_map[file_path]["pages"][page_number] = []

            file_map[file_path]["pages"][page_number].append(
                ChunkMetadata(
                    chunk_number=chunk_number,
                    page_number=page_number,
                    score=score,
                    content=content,
                )
            )

        if not file_map:
            logger.warning("[FLOW] _resolve_citations: file_map is empty after processing all indices")
            return None

        citations: List[FileRef] = []
        for file_path in sorted(file_map.keys()):
            entry = file_map[file_path]
            chunks: List[ChunkMetadata] = []
            for page_num in sorted(entry["pages"].keys()):
                page_chunks = sorted(entry["pages"][page_num], key=lambda c: c.chunk_number)
                chunks.extend(page_chunks)
            citations.append(FileRef(
                file_path=file_path,
                file_id=entry["file_id"],
                chunks=chunks,
            ))

        logger.info(f"[FLOW] Resolved {len(citations)} file citation(s) from {len(selected)} selected index(es)")
        return citations

    # ── Main flow ───────────────────────────────────────────────────

    @start()
    async def execute_flow(self):
        query_preview = self.state.query
        if len(query_preview) > 60:
            query_preview = query_preview[:57] + "..."

        self.reporter.report(f'Analyzing request "{query_preview}"')
        logger.info(f"Processing Query: '{self.state.query}'")

        self.reporter.report("Connecting to knowledge services...")

        all_tools = get_proxy_tools(
            status_callback=self.reporter.report,
            search_filter=self.state.search_filter,
            tool_results_store=self.state.tool_results_store,
        )

        mode = self.state.mode
        tools_for_task = self._select_tools_for_mode(mode, all_tools)
        self.reporter.report_tools(tools_for_task)

        # Build context block and emit status reports
        self._report_context_and_history()
        context_block = self._build_context_block()

        # Format Metadata
        metadata_str = ""
        if self.state.metadata:
            metadata_str = f"# METADATA\n- **Reference:**\n{json.dumps(self.state.metadata, indent=2, ensure_ascii=False)}"

        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Create agent
        self.reporter.report("Initializing AI agent...")
        agent = create_search_agent(
            step_callback=self.reporter.report,
            llm_callbacks=self.llm_callbacks,
            stream_llm=self.stream_llm,
        )
        self.reporter.report(f'Agent ready — role: "{agent.role}"')

        self.reporter.report(
            f'Building task for query "{query_preview}" in mode "{mode}"'
        )

        task = create_task(
            agent=agent,
            mode=mode,
            query=self.state.query,
            context_block=context_block,
            metadata=metadata_str,
            current_time=current_time,
            tools=tools_for_task,
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            verbose=settings.verbose,
            tracing=settings.crew_tracing,
            task_callback=self.reporter.report_task_completion,
            step_callback=self.reporter.report,
            max_rpm=settings.crew_max_rpm,
            stream=self.stream_llm,
        )

        # Async execution
        self.reporter.report(f'Sending query "{query_preview}"')
        crew_output = await crew.kickoff_async()

        # ── Post-processing for non-streaming mode only ──
        # (Streaming mode post-processing happens in search_service._run_flow_and_emit
        #  after the full text is available via get_full_text())
        ai_pydantic = getattr(crew_output, "pydantic", None)

        logger.debug(
            f"[FLOW] Post-processing | "
            f"crew_output type={type(crew_output).__name__} | "
            f"ai_pydantic type={type(ai_pydantic).__name__} | "
            f"tool_results_store size={len(self.state.tool_results_store)}"
        )

        if isinstance(ai_pydantic, AISearchResponse):
            logger.debug(
                f"[FLOW] AISearchResponse detected | "
                f"selected_indices={ai_pydantic.selected_indices}"
            )
            citations = self._resolve_citations(ai_pydantic)
            final_response = SearchResponse(
                title=ai_pydantic.title,
                response=ai_pydantic.response,
                citations=citations,
            )
            logger.debug(
                f"[FLOW] Final SearchResponse built | "
                f"citations={[c.file_path for c in citations] if citations else None}"
            )
            return final_response
        elif isinstance(ai_pydantic, ChatResponse):
            # Chat mode — no citations needed, wrap in SearchResponse without citations
            return SearchResponse(
                title=ai_pydantic.title,
                response=ai_pydantic.response,
                citations=None,
            )
        else:
            # Streaming mode: pydantic not yet set on CrewStreamingOutput — return raw output
            # search_service._run_flow_and_emit will handle citation resolution via get_full_text()
            logger.debug(
                f"[FLOW] Returning raw crew_output (type={type(crew_output).__name__}) — "
                f"likely streaming mode, post-processing deferred to search_service"
            )
            return crew_output
