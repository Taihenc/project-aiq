from crewai import Task, Agent
from typing import List, Optional
from src.models.state import IntentOutput, CapabilityPlan, FlowResponse
from src.config.settings import ORGANIZATION_CONTEXT


def create_classify_intent_task(agent: Agent, query: str) -> Task:
    task_desc = f"""
    Analyze the user's query: '{query}'
    Domain Context: {ORGANIZATION_CONTEXT}
    
    IMPORTANT NOTE:
    - The user may be referring to a previous conversation (History) or attached files (Context) which YOU CANNOT SEE.
    - If the query seems vague or refers to "it", "that", "the file", assume it refers to the hidden context and is VALID.
    - Do NOT reject if you are unsure. Favor 'chat' or 'search' over 'reject' when in doubt.

    Classify into one of these 3 types (Output 'action' and 'description'):

    1. chat
       - Casual, non-functional interaction.
       - Greetings, small talk, or simple identity questions.

    2. search
       - Functional request, information seeking, or deep questions.
       - Specific information requests.
       - Commands to find something.

    3. reject
       - Query is clearly and blatantly unrelated to the domain/company context (e.g., asking for recipes, sports).
       - Offensive requests.
       - ONLY reject if you are certain it cannot be related to the hidden context.

    Return the classification result as valid IntentOutput JSON.
    """
    return Task(
        description=task_desc,
        expected_output="IntentOutput JSON",
        agent=agent,
        output_pydantic=IntentOutput,
    )


def create_plan_capabilities_task(agent: Agent, query: str, context_str: str) -> Task:
    task_desc = f"""
    Analyze Query: '{query}'
    {context_str}

    Identify the required capabilities (List of Enum). return valid JSON :
    
    - search
        - General, semantic, or fact-based queries.
    
    - graph_search
        - Broad, relationship-oriented, or structural queries.
    
    - page_lookup
        - User explicitly specified a Page Number (e.g. "page 4", "page 10")
    
    Output a list of required capabilities suitable for CapabilityPlan JSON.
        Example: [(search, "Find file A"), (page_lookup, "Read page 46")]
    """
    return Task(
        description=task_desc,
        expected_output="CapabilityPlan JSON",
        agent=agent,
        output_pydantic=CapabilityPlan,
    )


def create_transform_query_task(agent: Agent, query: str) -> Task:
    return Task(
        description=(
            f"The user is inquiring about a specific subject. "
            f"1. Identify the core SUBJECT from the query: '{query}' "
            f"2. CRITICAL RULE: If the query mentions a 'container' (e.g., file, document, report, paper, email, sheet), "
            f"you MUST DISCARD the container term and focus ONLY on the subject inside it. "
            f"3. Formulate a comprehensive question about the SUBJECT itself (definition, characteristics, details). "
            f"   - WRONG: 'What is in the marketing file?' "
            f"   - RIGHT: 'What are the details and objectives of the marketing strategy?' "
        ),
        expected_output="A single rephrased question string.",
        agent=agent,
    )


def create_hyde_generation_task(agent: Agent, context_task: Task) -> Task:
    return Task(
        description="Provide a comprehensive answer to the rephrased question as if you know it perfectly.",
        expected_output="A comprehensive hypothetical answer paragraph.",
        agent=agent,
        context=[context_task],
    )


def create_execute_search_task(
    agent: Agent, query: str, intent_action: str, context_str: str, history_str: str
) -> Task:
    task_desc = f"""
    Analyze Query: '{query}'
    Intent: {intent_action}
    {context_str}
    {history_str}
    
    YOUR GOAL: Produce a final structured response (FlowResponse JSON).

    INSTRUCTIONS:

    1. IF Intent is 'chat':
       - DO NOT use any tools.
       - Answer politely and naturally based on History/Context.
       - Output: action='chat', response="Your reply", details=[]

    2. IF Intent is 'search':
       - USE TOOLS to find information (VectorSearchTool, PageLookupTool, etc.).
       - !!! PRIORITY !!! Check 'Attached Files Context' FIRST. If it answers the query, USE IT and skip tools.
       - Synthesize the answer from Context + Tool Results.
       - Output: action='search', response="Comprehensive answer", details=[Citation objects...]

    3. CITATION RULES ('details' field):
       - Collect sources from 'Attached Files Context' or 'Tool Outputs'.
       - Format as a list of Citation objects:
         {{
            "source": "vector_search" | "page_lookup" | ...,
            "content": <THE FULL JSON OUTPUT OBJECT FROM THE TOOL>
         }}
       - Valid sources: 'vector_search', 'page_lookup', 'chunk_lookup', 'graph_search', 'manual_attachment'.
       - If 'chat', details MUST be empty.

    Return strictly valid FlowResponse JSON.
    """
    return Task(
        description=task_desc,
        expected_output="FlowResponse JSON",
        agent=agent,
        output_pydantic=FlowResponse,
    )
