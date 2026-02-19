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

    @start()
    async def execute_flow(self):

        # Fetch tools dynamically within the flow (Encapsulation)
        tools = await MCPToolFactory.get_tools()

        agent = create_search_agent(tools=tools)

        # Default values are empty strings if no data
        formatted_context = self._format_context()
        formatted_history = self._format_history()

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

        task = create_search_task(
            agent=agent,
            query=self.state.query,
            context_block=context_block,
            mode_instruction=mode_instruction,
            metadata=metadata_str,
            current_time=current_time,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=True, tracing=True)
        # Async execution
        result = await crew.kickoff_async()

        # CrewOutput pydantic access
        self.state.final_response = result.pydantic
