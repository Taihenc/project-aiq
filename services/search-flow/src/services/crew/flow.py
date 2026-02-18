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
        return f"\nAttached Files Context:\n{json.dumps(context_data, indent=2, ensure_ascii=False)}\n"

    def _format_history(self) -> str:
        """Helper to format chat history for LLM prompts."""
        if not self.state.history:
            return ""
        return f"\nChat History:\n{json.dumps(self.state.history, indent=2, ensure_ascii=False)}\n"

    @start()
    async def execute_flow(self):
        print(f"\n🔹 [Manager] Processing Query: '{self.state.query}'")

        # Fetch tools dynamically within the flow (Encapsulation)
        tools = await MCPToolFactory.get_tools()

        agent = create_manager_agent(tools=tools)

        formatted_context = self._format_context()
        formatted_history = self._format_history()
        if not formatted_context:
            formatted_context = "No attachments provided."
        if not formatted_history:
            formatted_history = "No chat history."

        task = create_manager_task(
            agent=agent,
            query=self.state.query,
            context_str=formatted_context,
            history_str=formatted_history,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=True, tracing=True)
        # Async execution
        result = await crew.kickoff_async()

        # CrewOutput pydantic access
        self.state.final_response = result.pydantic

        print(f"✅ Action: {self.state.final_response.action.upper()}")
        print(f"✅ Response: {self.state.final_response.response[:100]}...")
