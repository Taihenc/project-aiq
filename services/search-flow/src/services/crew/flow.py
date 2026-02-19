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
    # TODO: Temporary method
    def _format_context(self) -> str:
        """Helper to format structured context for LLM prompts."""
        if not self.state.context:
            return ""
        context_data = [item.model_dump() for item in self.state.context]
        return f"- **Reference Data (Attachments):**\n{json.dumps(context_data, indent=2, ensure_ascii=False)}\n"

    def _format_history(self) -> str:
        """Helper to format chat history for LLM prompts."""
        if not self.state.history:
            return ""
        return f"- **Conversation Record (History):**\n{json.dumps(self.state.history, indent=2, ensure_ascii=False)}\n"

    @start()
    async def execute_flow(self):
        print(f"\n🔹 [Manager] Processing Query: '{self.state.query}'")

        # Fetch tools dynamically within the flow (Encapsulation)
        tools = await MCPToolFactory.get_tools()

        agent = create_manager_agent(tools=tools)

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

        task = create_manager_task(
            agent=agent,
            query=self.state.query,
            context_block=context_block,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=True, tracing=True)
        # Async execution
        result = await crew.kickoff_async()

        # CrewOutput pydantic access
        self.state.final_response = result.pydantic

        print(f"✅ Action: {self.state.final_response.action.upper()}")
        print(f"✅ Response: {self.state.final_response.response[:100]}...")
