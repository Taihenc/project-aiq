from crewai import Agent, LLM
from src.config.settings import settings
from src.config.prompts import AgentPrompts
from src.services.crew.tools.mcp import MCPTool


def get_llm():
    return LLM(model=settings.azure_model_name)


def create_search_agent(tools: list = []) -> Agent:
    return Agent(
        role=AgentPrompts.SEARCH_AGENT_ROLE,
        goal=AgentPrompts.SEARCH_AGENT_GOAL,
        backstory=AgentPrompts.SEARCH_AGENT_BACKSTORY,
        tools=tools,
        llm=get_llm(),
        verbose=settings.crew_verbose,
        max_iter=settings.crew_max_iter,
    )
