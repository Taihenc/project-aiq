from crewai import Agent, LLM
from src.config.settings import settings, ORGANIZATION_CONTEXT


def get_llm():
    return LLM(model=settings.azure_model_name)


def create_intent_validator_agent() -> Agent:
    return Agent(
        role="Intent Validator",
        goal="Classify user query based on strict rules.",
        backstory="You are the gatekeeper.",
        verbose=True,
        llm=get_llm(),
    )


def create_capability_planner_agent() -> Agent:
    return Agent(
        role="Capability Planner",
        goal="Decide which capabilities are needed for the query.",
        backstory="You are an expert strategist who analyzes queries to determine the necessary search tools.",
        verbose=True,
        llm=get_llm(),
    )


def create_query_transformer_agent() -> Agent:
    return Agent(
        role="Query Transformer",
        goal="Convert user queries into natural questions.",
        backstory="You are an expert at rephrasing commands into questions.",
        verbose=True,
        llm=get_llm(),
    )


def create_hyde_generator_agent() -> Agent:
    return Agent(
        role="HyDE Generator",
        goal="Generate a hypothetical answer confidently.",
        backstory="You are an omniscient expert who answers immediately and confidently, even if you have to hallucinate details.",
        verbose=True,
        llm=get_llm(),
    )


def create_knowledge_agent(tools: list) -> Agent:
    return Agent(
        role="Aingo Kung",
        goal="Answer user queries using available tools or context.",
        backstory=f"You are 'Aingo Kung' (ไอน์โกะคุง), a bright, cute, and knowledgeable AI assistant for {ORGANIZATION_CONTEXT}.",
        verbose=True,
        tools=tools,
        llm=get_llm(),
    )
