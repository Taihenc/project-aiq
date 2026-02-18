from crewai import Agent, LLM
from src.config.settings import settings
from src.config.prompts import AgentPrompts
from src.services.crew.tools.mcp import MCPTool


def get_llm():
    return LLM(model=settings.azure_model_name)


def create_manager_agent(tools: list = []) -> Agent:
    return Agent(
        role=AgentPrompts.MANAGER_ROLE,
        goal=AgentPrompts.MANAGER_GOAL,
        backstory=AgentPrompts.MANAGER_BACKSTORY,
        tools=tools,
        llm=get_llm(),
        verbose=True,
        allow_delegation=False,
        max_iter=5,  # Allow tool use iterations
    )
