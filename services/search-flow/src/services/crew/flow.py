import json
from crewai.flow.flow import Flow, listen, start, router
from crewai import Crew, Process

from src.models.state import (
    FlowState,
    FlowResponse,
    IntentOutput,
    CapabilityPlan,
)
from src.config.settings import ORGANIZATION_CONTEXT
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
from src.services.crew.tools.mcp import MCPTool
from pydantic import BaseModel, Field
from typing import Type


class VectorSearchInput(BaseModel):
    query: str = Field(..., description="The search query text.")
    top_k: int = Field(10, description="Number of results from semantic search.")
    top_n: int = Field(10, description="Number of results from rerank.")
    score_threshold: float = Field(0.0, description="Minimum similarity score.")


class ChunkLookupInput(BaseModel):
    chunk_id: str = Field(..., description="Target chunk ID.")
    backward: int = Field(2, description="Number of chunks before the target chunk.")
    forward: int = Field(2, description="Number of chunks after the target chunk.")


class PageLookupInput(BaseModel):
    file_path: str = Field(
        ..., description="Path of the file in the embedding service."
    )
    start_page: int = Field(..., description="Starting page index (inclusive).")
    end_page: int = Field(..., description="Ending page index (inclusive).")


class SearchCrewFlow(Flow[FlowState]):
    def _format_context(self) -> str:
        """Helper to format structured context for LLM prompts."""
        if not self.state.context:
            return ""
        return f"\nAttached Files Context:\n{json.dumps(self.state.context, indent=2, ensure_ascii=False)}\n"

    def _format_history(self) -> str:
        """Helper to format chat history for LLM prompts."""
        if not self.state.history:
            return ""
        return f"\nChat History:\n{self.state.history}\n"

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

        # 1. Filter Tools based on Plan
        selected_tools = []
        caps = [c.capability for c in self.state.capabilities]
        intent_action = self.state.intent.action if self.state.intent else "search"

        if intent_action != "chat":
            selected_tools.append(
                MCPTool(
                    name="retrieve_chunks",
                    description="Fetch surrounding chunks by ID. Use this ONLY when you have a valid chunk_id from search results and need more context.",
                    args_schema=ChunkLookupInput,
                    mcp_tool_name="retrieve_chunks",
                )
            )

            if "search" in caps:
                selected_tools.append(
                    MCPTool(
                        name="search_documents",
                        description="Global Document Search. Use this for semantic search, finding facts, keywords, or specific information across all documents. Returns content snippets with chunk_ids.",
                        args_schema=VectorSearchInput,
                        mcp_tool_name="search_documents",
                    )
                )

            if "graph_search" in caps:
                selected_tools.append(GraphTool())

            if "page_lookup" in caps:
                selected_tools.append(
                    MCPTool(
                        name="retrieve_pages",
                        description="Navigate to and read a specific page number of a file. Use this ONLY when the user explicitly specifies a file and page number.",
                        args_schema=PageLookupInput,
                        mcp_tool_name="retrieve_pages",
                    )
                )

        agent = create_knowledge_agent(selected_tools)
        task = create_execute_search_task(
            agent=agent,
            query=self.state.query,
            intent_action=intent_action,
            context_str=self._format_context(),
            history_str=self._format_history(),
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
        )
        result = crew.kickoff()

        self.state.final_response = result.pydantic
        print(f"✅ Final Output: {self.state.final_response.response}")
