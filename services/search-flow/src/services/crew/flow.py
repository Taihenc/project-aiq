import json
from datetime import datetime
from crewai.flow.flow import Flow, start
from crewai import Crew

from src.models.state import (
    FlowState,
)
from src.services.crew.agents import create_search_agent
from src.services.crew.tasks import create_task
from src.services.crew.tools.factory import MCPToolFactory
from src.services.crew.status_reporter import FlowStatusReporter


class SearchCrewFlow(Flow[FlowState]):
    def __init__(self, step_callback=None):
        super().__init__()
        self.reporter = FlowStatusReporter(step_callback)

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

    def _get_tools_for_mode(self, mode: str, all_tools: list) -> list:
        # Mock map for tool names based on action/mode
        mock_search_tools = ["search"]  # Replace with actual mock names
        mock_lookup_tools = ["lookup"]

        if mode == "auto":
            return all_tools
        elif mode == "search":
            tools = [t for t in all_tools if t.name in mock_search_tools]
            return tools if tools else all_tools
        elif mode == "lookup":
            tools = [t for t in all_tools if t.name in mock_lookup_tools]
            return tools if tools else all_tools
        elif mode == "chat":
            return []

        return all_tools

    def _build_context_block(self) -> str:
        formatted_context = self._format_context()
        self.reporter.report_context(self.state.context)

        formatted_history = self._format_history()
        self.reporter.report_history(self.state.history)

        context_block = ""
        if formatted_context or formatted_history:
            context_block = "# CONTEXT (Current Environment & Data)\n"
            if formatted_context:
                context_block += formatted_context + "\n"
            else:
                context_block += "No attachments provided.\n"

            if formatted_history:
                context_block += formatted_history + "\n"
            else:
                context_block += "No chat history.\n"

        return context_block

    @start()
    async def execute_flow(self):
        query_preview = self.state.query
        if len(query_preview) > 60:
            query_preview = query_preview[:57] + "..."

        self.reporter.report(f'Analyzing request "{query_preview}"')
        print(f"\n🔹 [Search Agent] Processing Query: '{self.state.query}'")

        # Fetch tools dynamically within the flow
        self.reporter.report("Connecting to knowledge services...")
        all_tools = await MCPToolFactory.get_tools(status_callback=self.reporter.report)

        mode = self.state.mode
        tools_for_task = self._get_tools_for_mode(mode, all_tools)
        self.reporter.report_tools(tools_for_task)

        # Prepare context and history
        context_block = self._build_context_block()

        # Format Metadata
        metadata_str = ""
        if self.state.metadata:
            metadata_str = f"# METADATA\n- **Reference:**\n{json.dumps(self.state.metadata, indent=2, ensure_ascii=False)}"

        # Get current time for the prompt
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Create agent
        self.reporter.report("Initializing AI agent...")
        agent = create_search_agent(step_callback=self.reporter.report)
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
            verbose=True,
            tracing=True,
            task_callback=self.reporter.report_task_completion,
            step_callback=self.reporter.report,
        )

        # Async execution
        self.reporter.report(f'Sending query "{query_preview}"')
        result = await crew.kickoff_async()

        # CrewOutput pydantic access
        self.state.final_response = result.pydantic

        self.reporter.report("Response ready!")
        print(f"✅ Action: {self.state.final_response.action.upper()}")
        print(f"✅ Response: {self.state.final_response.response[:100]}...")
