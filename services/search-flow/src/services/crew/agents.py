from crewai import Agent, LLM
from src.config.settings import settings
from src.config.prompts import AgentPrompts


def get_llm(callbacks=None, stream: bool = True):
    from src.config.settings import settings

    return LLM(
        model=f"azure/{settings.azure_model_name}",
        api_key=settings.azure_api_key,
        base_url=settings.azure_api_base,
        api_version=settings.azure_api_version,
        callbacks=callbacks,
        stream=stream,
    )


def create_search_agent(
    step_callback=None, llm_callbacks=None, stream_llm: bool = True
) -> Agent:
    return Agent(
        role=AgentPrompts.SEARCH_AGENT_ROLE,
        goal=AgentPrompts.SEARCH_AGENT_GOAL,
        backstory=AgentPrompts.SEARCH_AGENT_BACKSTORY,
        llm=get_llm(callbacks=llm_callbacks, stream=stream_llm),
        verbose=settings.crew_verbose,
        allow_delegation=False,
        max_iter=settings.crew_max_iter,
        step_callback=step_callback,
    )
