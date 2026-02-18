import json
from crewai.flow.flow import Flow, start
from crewai import Crew

from src.models.state import (
    FlowState,
)
from src.services.crew.agents import create_manager_agent
from src.services.crew.tasks import create_manager_task
from src.services.crew.tools.factory import MCPToolFactory


class SearchCrewFlow(Flow[FlowState]):
    def __init__(self, step_callback=None):
        super().__init__()
        self.step_callback = step_callback

    # TODO: Temporary method
    def _format_context(self) -> str:
        """Helper to format structured context for LLM prompts."""
        if not self.state.context:
            return ""
        context_data = [item.model_dump() for item in self.state.context]
        return f"\nAttached Files Context:\n{json.dumps(context_data, indent=2, ensure_ascii=False)}\n"

    def _format_history(self) -> str:
        """Helper to format chat history for LLM prompts."""
        if not self.state.history:
            return ""
        return f"\nChat History:\n{json.dumps(self.state.history, indent=2, ensure_ascii=False)}\n"

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
        print(f"\n🔹 [Manager] Processing Query: '{self.state.query}'")

        # Fetch tools dynamically within the flow
        self._report_status("Connecting to knowledge services...")
        tools = await MCPToolFactory.get_tools(status_callback=self._report_status)
        tool_names = ", ".join(t.name.replace("_", " ") for t in tools)
        self._report_status(f"Loaded {len(tools)} tools: {tool_names}")

        # Prepare context and history
        formatted_context = self._format_context()
        formatted_history = self._format_history()

        if self.state.context:
            file_names = []
            total_chunks = 0
            for item in self.state.context:
                name = item.file_path.split("/")[-1] if "/" in item.file_path else item.file_path
                if len(name) > 30:
                    name = name[:27] + "..."
                file_names.append(name)
                total_chunks += len(item.chunks)
            files_str = ", ".join(file_names)
            self._report_status(f"Processing {len(self.state.context)} document{'s' if len(self.state.context) > 1 else ''}: {files_str}")
            self._report_status(f"Reading {total_chunks} content chunk{'s' if total_chunks > 1 else ''} from documents...")
        else:
            formatted_context = "No attachments provided."

        if self.state.history:
            history_count = len(self.state.history)
            # Show preview of the last message in history
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

        # Create agent and task
        self._report_status("Initializing AI agent...")
        agent = create_manager_agent(tools=tools, step_callback=self.step_callback)
        self._report_status(f'Agent ready — role: "{agent.role}"')

        self._report_status(f'Building task for query "{query_preview}"')
        task = create_manager_task(
            agent=agent,
            query=self.state.query,
            context_str=formatted_context,
            history_str=formatted_history,
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
