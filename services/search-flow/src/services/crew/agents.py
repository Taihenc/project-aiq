from crewai import Agent, LLM
from src.config.settings import settings
from src.config.prompts import AgentPrompts


def get_llm():
    return LLM(model=settings.azure_model_name)


def create_validate_agent() -> Agent:
    return Agent(
        role="Intent Validator",
        goal=AgentPrompts.VALIDATE_CREW_GOAL,
        backstory=AgentPrompts.VALIDATE_CREW_BACKSTORY,
        verbose=True,
        llm=get_llm(),
    )


def create_ask_agent() -> Agent:
    return Agent(
        role="Answer Specialist",
        goal=AgentPrompts.ASK_CREW_GOAL,
        backstory=AgentPrompts.ASK_CREW_BACKSTORY,
        verbose=True,
        llm=get_llm(),
    )


def create_lookup_agent(tools: list) -> Agent:
    return Agent(
        role="Librarian",
        goal=AgentPrompts.LOOKUP_CREW_GOAL,
        backstory=AgentPrompts.LOOKUP_CREW_BACKSTORY,
        verbose=True,
        tools=tools,
        llm=get_llm(),
    )


def create_search_agent(tools: list) -> Agent:
    return Agent(
        role="Research Specialist",
        goal=AgentPrompts.SEARCH_CREW_GOAL,
        backstory=AgentPrompts.SEARCH_CREW_BACKSTORY,
        verbose=True,
        tools=tools,
        llm=get_llm(),
    )
