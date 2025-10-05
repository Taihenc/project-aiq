from crewai import LLM, Agent, Crew, Process, Task, llm
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
import os

from litellm import gemini_models

# If you want to run a snippet of code before or after the crew starts,
# you can use the @before_kickoff and @after_kickoff decorators
# https://docs.crewai.com/concepts/crews#example-crew-class-with-decorators


@CrewBase
class Creawai:
    """Creawai crew"""

    agents: List[BaseAgent]
    tasks: List[Task]

    # Learn more about YAML configuration files here:
    # Agents: https://docs.crewai.com/concepts/agents#yaml-configuration-recommended
    # Tasks: https://docs.crewai.com/concepts/tasks#yaml-configuration-recommended

    # If you would like to add tools to your agents, you can learn more about it here:
    # https://docs.crewai.com/concepts/agents#agent-tools
    llm = LLM(
        model="gemini/gemini-2.0-flash",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.0,
    )

    @agent
    def rag_analyzer(self) -> Agent:
        return Agent(
            config=self.agents_config["rag_analyzer"],  # type: ignore[index]
            verbose=True,
            llm=self.llm,
        )

    @agent
    def chat_responder(self) -> Agent:
        return Agent(
            config=self.agents_config["chat_responder"],  # type: ignore[index]
            verbose=True,
            llm=self.llm,
        )

    # To learn more about structured task outputs,
    # task dependencies, and task callbacks, check out the documentation:
    # https://docs.crewai.com/concepts/tasks#overview-of-a-task
    @task
    def analyze_search_results(self) -> Task:
        return Task(
            config=self.tasks_config["analyze_search_results"],  # type: ignore[index]
        )

    @task
    def generate_chat_response(self) -> Task:
        return Task(
            config=self.tasks_config["generate_chat_response"],  # type: ignore[index]
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Creawai crew"""
        # To learn how to add knowledge sources to your crew, check out the documentation:
        # https://docs.crewai.com/concepts/knowledge#what-is-knowledge

        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            process=Process.sequential,
            verbose=True,
            # process=Process.hierarchical, # In case you wanna use that instead https://docs.crewai.com/how-to/Hierarchical/
        )
