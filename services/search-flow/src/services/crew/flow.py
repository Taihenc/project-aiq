import json
from datetime import datetime
from crewai.flow.flow import Flow, start
from crewai import Crew

from src.models.state import (
    FlowState,
)
from src.services.crew.agents import create_search_agent
from src.services.crew.tasks import create_search_task
from src.services.crew.tools.factory import MCPToolFactory


class SearchCrewFlow(Flow[FlowState]):
    def __init__(self, step_callback=None):
        super().__init__()
        self.step_callback = step_callback

    def _format_context(self) -> str:
        """Helper to format structured context for LLM prompts."""
        if not self.state.context:
            return ""
        return f"- **Reference Data (Attachments):**\n{self.state.context}\n"

    def _format_history(self) -> str:
        """Helper to format chat history for LLM prompts."""
        if not self.state.history:
            return ""
        return f"- **Conversation Record (History):**\n{json.dumps(self.state.history, indent=2, ensure_ascii=False)}\n"

    def _report_status(self, message: str):
        if self.step_callback:
            self.step_callback(message)

    def _handle_task_completion(self, output):
        try:
            msg = "Finalizing results..."
            # Try to extract a meaningful summary from the task output
            if hasattr(output, "raw") and output.raw:
                raw = output.raw.strip()
                # If the output contains a JSON action, show action type
                if raw.startswith('{') and '"action"' in raw:
                    import json as _json
                    try:
                        parsed = _json.loads(raw)
                        action = parsed.get("action", "").upper()
                        if action == "SEARCH":
                            msg = "Search complete — composing response..."
                        elif action == "CHAT":
                            msg = "Preparing response..."
                        elif action == "REJECT":
                            msg = "Query analyzed — preparing response..."
                        elif action == "LOOKUP":
                            msg = "Lookup complete — composing response..."
                        else:
                            msg = "Analysis complete — preparing response..."
                    except Exception:
                        msg = "Analysis complete — preparing response..."
                else:
                    msg = "Analysis complete — preparing response..."

            self._report_status(msg)
        except Exception:
            pass

    @start()
    async def execute_flow(self):
        query_preview = self.state.query
        if len(query_preview) > 60:
            query_preview = query_preview[:57] + "..."

        self._report_status(f'Analyzing request "{query_preview}"')
        print(f"\n🔹 [Search Agent] Processing Query: '{self.state.query}'")

        # Fetch tools dynamically within the flow
        self._report_status("Connecting to knowledge services...")
        tools = await MCPToolFactory.get_tools(status_callback=self._report_status)
        tool_names = ", ".join(t.name.replace("_", " ") for t in tools)
        self._report_status(f"Loaded {len(tools)} tools: {tool_names}")

        # Prepare context and history
        formatted_context = self._format_context()
        formatted_history = self._format_history()

        if self.state.context:
            # context is an enriched string — report presence without iterating
            lines = [l for l in self.state.context.splitlines() if l.strip()]
            self._report_status(f"Processing attached documents ({len(lines)} lines of context)...")
        else:
            formatted_context = "No attachments provided."

        if self.state.history:
            history_count = len(self.state.history)
            last_msg = self.state.history[-1] if self.state.history else None
            preview = ""
            if isinstance(last_msg, dict):
                content = last_msg.get("content", "") or last_msg.get("message", "")
                if content:
                    preview = content if len(content) <= 40 else content[:37] + "..."
                    preview = f' — last: "{preview}"'
            self._report_status(f"Loading {history_count} previous message{'s' if history_count > 1 else ''}{preview}")
        else:
            formatted_history = "No chat history."

        context_block = ""
        if formatted_context or formatted_history:
            context_block = "# CONTEXT (Current Environment & Data)\n"
            if formatted_context:
                context_block += formatted_context + "\n"
            if formatted_history:
                context_block += formatted_history + "\n"

        # Determine Mode Instruction
        mode = self.state.mode
        mode_instruction = ""
        if mode in ["search", "lookup", "chat"]:
            mode_instruction = (
                f"**STRICT MODE ENFORCED:** The user has explicitly selected '{mode.upper()}' mode. "
                f"You MUST perform a '{mode}' action. If the user query is unrelated to '{mode}', "
                "you must REJECT and ask for clarification."
            )

        # Format Metadata
        metadata_str = ""
        if self.state.metadata:
            metadata_str = f"# METADATA\n- **Reference:**\n{json.dumps(self.state.metadata, indent=2, ensure_ascii=False)}"

        # Get current time for the prompt
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Create agent and task
        self._report_status("Initializing AI agent...")
        agent = create_search_agent(tools=tools, step_callback=self.step_callback)
        self._report_status(f'Agent ready — role: "{agent.role}"')

        self._report_status(f'Building task for query "{query_preview}"')
        task = create_search_task(
            agent=agent,
            query=self.state.query,
            context_block=context_block,
            mode_instruction=mode_instruction,
            metadata=metadata_str,
            current_time=current_time,
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            verbose=True,
            tracing=True,
            task_callback=self._handle_task_completion,
            step_callback=self.step_callback,
        )

        # Async execution
        self._report_status(f'Sending query "{query_preview}"')
        result = await crew.kickoff_async()

        # CrewOutput pydantic access
        self.state.final_response = result.pydantic

        self._report_status("Response ready!")
        print(f"✅ Action: {self.state.final_response.action.upper()}")
        print(f"✅ Response: {self.state.final_response.response[:100]}...")
