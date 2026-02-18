from crewai import Agent, LLM
from src.config.settings import settings
from src.config.prompts import AgentPrompts
from src.services.crew.tools.mcp import MCPTool


def get_llm():
    return LLM(
        model=f"azure/{settings.azure_model_name}",
        api_key=settings.azure_api_key,
        base_url=settings.azure_api_base,
        api_version=settings.azure_api_version,
    )


def create_manager_agent(tools: list = [], step_callback=None) -> Agent:
    return Agent(
        role=AgentPrompts.MANAGER_ROLE,
        goal=AgentPrompts.MANAGER_GOAL,
        backstory=AgentPrompts.MANAGER_BACKSTORY,   
        tools=tools,
        llm=get_llm(),
        verbose=True,
        allow_delegation=False,
        max_iter=5,  # Allow tool use iterations
        step_callback=step_callback,
    )
