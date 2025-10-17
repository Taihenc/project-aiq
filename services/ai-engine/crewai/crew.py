from crewai import LLM, Agent, Crew, Process, Task, llm
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
import os

from tools import DocumentSearchTool
from models import (
    OrchestratorOutput,
    RAGAnalyzerOutput,
    ChatResponderOutput,
)


@CrewBase
class DocumentSearchCrew:
    """
    Document search crew for RAG-based document retrieval and response generation.

    Flow:
    1. Orchestrator → Validates query and decides routing (SEARCH/DIRECT/CLARIFICATION)
    2. RAG Analyzer → Searches documents using semantic search + reranking (if SEARCH_REQUIRED)
    3. Chat Responder → Generates final response in user's language with sources

    Agents: orchestrator, rag_analyzer, chat_responder
    Process: Sequential (one after another)
    """

    agents: List[BaseAgent]
    tasks: List[Task]

    llm = LLM(
        model="azure/gpt-4o-mini",
        api_key=os.getenv("AZURE_API_KEY"),
        base_url=os.getenv("AZURE_API_BASE"),
        api_version=os.getenv("AZURE_API_VERSION"),
        temperature=0.7,
    )

    @agent
    def orchestrator(self) -> Agent:
        return Agent(
            config=self.agents_config["orchestrator"],
            verbose=True,
            llm=self.llm,
        )

    @agent
    def rag_analyzer(self) -> Agent:
        return Agent(
            config=self.agents_config["rag_analyzer"],
            verbose=True,
            llm=self.llm,
            tools=[DocumentSearchTool()],
        )

    @agent
    def chat_responder(self) -> Agent:
        return Agent(
            config=self.agents_config["chat_responder"],
            verbose=True,
            llm=self.llm,
        )

    @task
    def validate_and_route(self) -> Task:
        return Task(
            config=self.tasks_config["validate_and_route"],
            output_pydantic=OrchestratorOutput,
        )

    @task
    def search_and_analyze(self) -> Task:
        return Task(
            config=self.tasks_config["search_and_analyze"],
            output_pydantic=RAGAnalyzerOutput,
            context=[self.validate_and_route()],
        )

    @task
    def generate_response(self) -> Task:
        return Task(
            config=self.tasks_config["generate_response"],
            output_pydantic=ChatResponderOutput,
            context=[self.validate_and_route(), self.search_and_analyze()],
        )

    @crew
    def crew(self) -> Crew:
        """the document search crew"""

        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=False,
        )
