import json
from crewai.flow.flow import Flow, listen, start, router
from crewai import Crew, Process

from src.models.state import (
    FlowState,
    FlowResponse,
    ValidationOutput,
    AskOutput,
    LookupOutput,
    SearchOutput,
    Citation,
)
from src.config.settings import settings
from src.services.crew.agents import (
    create_validate_agent,
    create_ask_agent,
    create_lookup_agent,
    create_search_agent,
)
from src.services.crew.tasks import (
    create_validate_task,
    create_ask_task,
    create_lookup_task,
    create_search_sim_task,
    create_search_exec_task,
    create_search_verify_task,
)

from pydantic import BaseModel, Field
from typing import Type


class SearchCrewFlow(Flow[FlowState]):
    def _format_context(self) -> str:
        """Helper to format structured context for LLM prompts."""
        if not self.state.context:
            return ""
        # Convert Pydantic models to dicts for JSON serialization
        context_data = [item.model_dump() for item in self.state.context]
        return f"\nAttached Files Context:\n{json.dumps(context_data, indent=2, ensure_ascii=False)}\n"

    def _format_history(self) -> str:
        """Helper to format chat history for LLM prompts."""
        if not self.state.history:
            return ""
        return f"\nChat History:\n{self.state.history}\n"

    def set_tools(self, tools: list):
        """Setter for tools injection."""
        self.tools = tools

    @start()
    def validate_intent(self):
        print(f"\n🔹 [Validate Crew] Analyzing Query: '{self.state.query}'")
        agent = create_validate_agent()

        task = create_validate_task(
            agent=agent,
            query=self.state.query,
            context_str=self._format_context(),
            history_str=self._format_history(),
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=True, tracing=True)
        self.state.validation_output = crew.kickoff().pydantic

        # Update context with filtered context from validation
        if self.state.validation_output.context:
            self.state.context = self.state.validation_output.context

        print(f"✅ Decision: {self.state.validation_output.action.upper()}")
        print(f"✅ Response/Reason: {self.state.validation_output.response}")

    @router(validate_intent)
    def route_flow(self):
        action = self.state.validation_output.action

        if action == "reject":
            self.state.final_response = FlowResponse(
                action="reject",
                response=self.state.validation_output.response,
            )
            return "stop_flow"

        if action == "ask":
            return "ask_route"

        if action == "chat":
            self.state.final_response = FlowResponse(
                action="chat",
                response=self.state.validation_output.response,
            )
            return "stop_flow"

        if action == "lookup":
            return "lookup_route"

        if action == "search":
            return "search_route"

        # Fallback
        return "stop_flow"

    @listen("ask_route")
    def run_ask_crew(self):
        print("\n🔹 [Ask Crew] Answering based on Context...")
        agent = create_ask_agent()
        task = create_ask_task(
            agent=agent,
            intent=self.state.validation_output.intent,
            context_str=self._format_context(),
            language=self.state.validation_output.language,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=True, tracing=True)
        ask_output = crew.kickoff().pydantic
        self.state.final_response = FlowResponse(
            action="ask",
            response=ask_output.answer,
        )
        print(f"✅ Answer: {self.state.final_response.response[:100]}...")

    @listen("lookup_route")
    def run_lookup_crew(self):
        print("\n🔹 [Look Up Crew] Retrieving specific content...")
        # Inject Tools
        agent = create_lookup_agent(tools=getattr(self, "tools", []))

        task = create_lookup_task(
            agent=agent,
            intent=self.state.validation_output.intent,
            context_str=self._format_context(),
            language=self.state.validation_output.language,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=True, tracing=True)
        lookup_output = crew.kickoff().pydantic
        # Convert LookupOutput details (Page/Chunk) to FlowResponse (Citations)
        citations = []
        if lookup_output.details:
            for item in lookup_output.details:
                citations.append(Citation(source=item.type, data=item))

        self.state.final_response = FlowResponse(
            action="lookup",
            response=lookup_output.content,
            details=citations,
        )
        print(f"✅ Look Up Result: {self.state.final_response.response[:100]}...")

    @listen("search_route")
    def run_search_crew(self):
        print("\n🔹 [Search Crew] Executing Multi-step Search...")
        agent = create_search_agent(tools=getattr(self, "tools", []))

        # Task 1: Simulate / Plan
        task1 = create_search_sim_task(
            agent=agent,
            intent=self.state.validation_output.intent,
            context_str=self._format_context(),
            language=self.state.validation_output.language,
        )

        # Task 2: Execute
        task2 = create_search_exec_task(
            agent=agent,
            input_prev_task=task1,
            intent=self.state.validation_output.intent,
        )

        # Task 3: Verify
        task3 = create_search_verify_task(
            agent=agent,
            input_prev_task=task2,
            intent=self.state.validation_output.intent,
            language=self.state.validation_output.language,
        )

        crew = Crew(
            agents=[agent],
            tasks=[task1, task2, task3],
            process=Process.sequential,
            verbose=True,
            tracing=True,
        )

        result = crew.kickoff()
        search_output = result.pydantic
        # Convert SearchOutput details (SearchContent) to FlowResponse (Citations)
        citations = []
        if search_output.details:
            for item in search_output.details:
                citations.append(Citation(source="search", data=item))

        self.state.final_response = FlowResponse(
            action="search",
            response=search_output.answer,
            details=citations,
        )
        print(f"✅ Search Result: {self.state.final_response.response[:100]}...")
