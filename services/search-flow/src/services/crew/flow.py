import json
from datetime import datetime
from typing import List

from loguru import logger
from crewai.flow.flow import Flow, start
from crewai import Crew

from src.config.settings import settings
from src.models.state import FlowState
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
        return await crew.kickoff_async()
