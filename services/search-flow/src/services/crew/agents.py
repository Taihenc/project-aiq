from crewai import Agent, LLM
from src.config.settings import settings, ORGANIZATION_CONTEXT
from src.config.prompts import AgentPrompts


def get_llm():
    return LLM(model=settings.azure_model_name)


def create_intent_validator_agent() -> Agent:
    return Agent(
        role="Intent Validator",
        goal=AgentPrompts.INTENT_VALIDATOR_GOAL,
        backstory=AgentPrompts.INTENT_VALIDATOR_BACKSTORY,
        verbose=True,
        llm=get_llm(),
    )


def create_capability_planner_agent() -> Agent:
    return Agent(
        role="Capability Planner",
        goal=AgentPrompts.CAPABILITY_PLANNER_GOAL,
        backstory=AgentPrompts.CAPABILITY_PLANNER_BACKSTORY,
        verbose=True,
        llm=get_llm(),
    )


def create_query_transformer_agent() -> Agent:
    return Agent(
        role="Query Transformer",
        goal=AgentPrompts.QUERY_TRANSFORMER_GOAL,
        backstory=AgentPrompts.QUERY_TRANSFORMER_BACKSTORY,
        verbose=True,
        llm=get_llm(),
    )


def create_hyde_generator_agent() -> Agent:
    return Agent(
        role="HyDE Generator",
        goal=AgentPrompts.HYDE_GENERATOR_GOAL,
        backstory=AgentPrompts.HYDE_GENERATOR_BACKSTORY,
        verbose=True,
        llm=get_llm(),
    )


def create_knowledge_agent(tools: list) -> Agent:
    return Agent(
        role="Aingo Kung",
        goal=AgentPrompts.KNOWLEDGE_AGENT_GOAL,
        backstory=AgentPrompts.KNOWLEDGE_AGENT_BACKSTORY_TEMPLATE.format(
            organization_context=ORGANIZATION_CONTEXT
        ),
        verbose=True,
        tools=tools,
        llm=get_llm(),
    )
