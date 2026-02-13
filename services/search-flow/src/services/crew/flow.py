import json
from crewai.flow.flow import Flow, listen, start, router
from crewai import Crew, Process

from src.models.state import (
    FlowState,
    FlowResponse,
    IntentOutput,
    CapabilityPlan,
)
from src.config.settings import settings
from src.services.crew.agents import (
    create_intent_validator_agent,
    create_capability_planner_agent,
    create_query_transformer_agent,
    create_hyde_generator_agent,
    create_knowledge_agent,
)
from src.services.crew.tasks import (
    create_classify_intent_task,
    create_plan_capabilities_task,
    create_transform_query_task,
    create_hyde_generation_task,
    create_execute_search_task,
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
    def classify_intent(self):
        print(f"\n🔹 [Intent Crew] Validating Intent for: '{self.state.query}'")
        agent = create_intent_validator_agent()
        task = create_classify_intent_task(agent, self.state.query)

        crew = Crew(agents=[agent], tasks=[task])
        self.state.intent = crew.kickoff().pydantic
        print(f"✅ Intent Action: {self.state.intent.action}")

    @router(classify_intent)
    def route_after_intent(self):
        action = self.state.intent.action

        if action == "reject":
            self.state.final_response = FlowResponse(
                action="reject",
                response=f"ฉันไม่สามารถช่วยคุณได้ เนื่องจาก : {self.state.intent.description}",
            )
            return "stop_flow"

        if action == "chat":
            return "start_search"

        return "start_planning"

    @listen("start_planning")
    def plan_capabilities(self):
        print("\n🔹 [Planner Crew] Loading Capabilities...")
        agent = create_capability_planner_agent()
        task = create_plan_capabilities_task(
            agent, self.state.query, self._format_context()
        )

        crew = Crew(agents=[agent], tasks=[task])
        plan = crew.kickoff().pydantic
        self.state.capabilities = plan.tasks
        print(f"✅ Plan: {self.state.capabilities}")

    @router(plan_capabilities)
    def route_after_planning(self):
        caps = [c.capability for c in self.state.capabilities]

        if not caps:
            # If no capabilities but we have context, proceed to search (synthesis)
            if self.state.context:
                print(
                    "🔹 [Router] Context available, proceeding to synthesis without search tools."
                )
                return "start_search"

            self.state.final_response = FlowResponse(
                action="no_skill", response="ฉันไม่มีความสามารถนั้น"
            )
            return "stop_flow"

        # Simplified routing: if we have capabilities, we likely need HyDE or just search
        # keeping logic similar to before:
        if "search" in caps or "graph_search" in caps:
            return "start_hyde"

        return "start_search"

    @listen("start_hyde")
    def generate_hyde(self):
        print("\n🔹 [HyDE Crew] Generating HyDE Context...")
        transformer = create_query_transformer_agent()
        hyde_agent = create_hyde_generator_agent()

        task_transform = create_transform_query_task(transformer, self.state.query)
        task_hyde = create_hyde_generation_task(hyde_agent, task_transform)

        crew = Crew(
            agents=[transformer, hyde_agent],
            tasks=[task_transform, task_hyde],
            process=Process.sequential,
        )

        result = crew.kickoff()
        self.state.hyde_result = result.raw
        return "start_search"

    @listen("start_search")
    def execute_search_entry(self):
        self.execute_search()

    def execute_search(self):
        print("\n🔹 [Knowledge Crew] Execution & Synthesis...")

        # Available tools are injected via self.tools
        available_tools = getattr(self, "tools", [])

        # Filter Tools based on Plan
        selected_tools = []
        caps = [c.capability for c in self.state.capabilities]
        intent_action = self.state.intent.action if self.state.intent else "search"

        if intent_action != "chat":
            # Map capabilities to tool names
            # Map capabilities to tool names using settings

            tool_map = settings.capability_tool_map

            required_tools = set()
            for cap in caps:
                mapped_name = tool_map.get(cap)
                if mapped_name:
                    required_tools.add(mapped_name)

            print(f"🔹 [Knowledge Crew] Required Tools: {required_tools}")

            # Filter available_tools based on required_tools
            if available_tools:
                for tool in available_tools:
                    # CrewAI Tool objects usually have a 'name' attribute
                    if tool.name in required_tools:
                        selected_tools.append(tool)
            else:
                print("⚠️ No MCP tools available or loaded.")

        agent = create_knowledge_agent(selected_tools)
        task = create_execute_search_task(
            agent=agent,
            query=self.state.query,
            intent_action=intent_action,
            context_str=self._format_context(),
            history_str=self._format_history(),
            hyde_result=self.state.hyde_result,
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
        )
        result = crew.kickoff()

        self.state.final_response = result.pydantic
        print(f"✅ Final Output: {self.state.final_response.response}")
