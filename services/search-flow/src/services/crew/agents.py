from crewai import Agent, LLM
from src.config.settings import settings
from src.config.prompts import AgentPrompts
from src.config.prompts import HyDEPrompts


def create_search_agent(
    step_callback=None, llm_callbacks=None, stream_llm: bool = True
) -> Agent:

    search_llm = LLM(
        model=f"azure/{settings.azure_model_name}",
        api_key=settings.azure_api_key,
        base_url=settings.azure_api_base,
        api_version=settings.azure_api_version,
        callbacks=llm_callbacks,
        stream=stream_llm,
        max_tokens=settings.crew_max_tokens,
    )

    return Agent(
        role=AgentPrompts.SEARCH_AGENT_ROLE,
        goal=AgentPrompts.SEARCH_AGENT_GOAL,
        backstory=AgentPrompts.SEARCH_AGENT_BACKSTORY,
        llm=search_llm,
        verbose=settings.crew_verbose,
        allow_delegation=False,
        max_iter=settings.crew_max_iter,
        max_rpm=settings.crew_max_rpm,
        max_execution_time=settings.crew_max_execution_time,
        step_callback=step_callback,
    )


def create_hyde_agent() -> Agent:

    hyde_llm = LLM(
        model=f"azure/{settings.azure_hyde_model_name}",
        api_key=settings.azure_api_key,
        base_url=settings.azure_api_base,
        api_version=settings.azure_api_version,
        stream=False,
        max_tokens=settings.crew_hyde_max_tokens,
    )

    return Agent(
        role=HyDEPrompts.AGENT_ROLE,
        goal=HyDEPrompts.AGENT_GOAL,
        backstory=HyDEPrompts.AGENT_BACKSTORY,
        llm=hyde_llm,
        verbose=settings.crew_hyde_verbose,
    )
