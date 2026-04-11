from crewai import Task, Agent
from src.config.prompts import TaskPrompts, MODE_PROMPTS, HyDEPrompts
from src.models.state import SearchResponse, ChatResponse, HyDEResponse


def create_task(
    agent: Agent,
    mode: str,
    query: str,
    context_block: str,
    current_time: str,
    metadata: str = "",
    tools: list | None = None,
) -> Task:
    tools = tools or []
    # Map the mode to the correct prompt constants
    prompt_config = MODE_PROMPTS.get(mode, MODE_PROMPTS["auto"])

    task_name = f"{mode.title()} Task"

    # Format the core job instruction with the query
    formatted_task_core = prompt_config.core_job.format(query=query)

    formatted_metadata = f"{metadata.strip()}\n" if metadata.strip() else ""
    formatted_context = f"{context_block.strip()}\n" if context_block.strip() else ""

    task_description = TaskPrompts.BASE_TASK_TEMPLATE.format(
        current_time=current_time,
        metadata=formatted_metadata,
        context_block=formatted_context,
        mode_rules=prompt_config.rules.strip(),
        task_core=formatted_task_core,
    ).strip()

    # Determine schema based on mode
    if mode == "chat":
        output_pydantic = ChatResponse
    else:
        output_pydantic = SearchResponse

    expected_output = TaskPrompts.BASE_OUTPUT_TEMPLATE.format(
        query=query, output_scenarios=prompt_config.output_scenarios
    )

    return Task(
        name=task_name,
        description=task_description,
        expected_output=expected_output,
        agent=agent,
        tools=tools,
        output_pydantic=output_pydantic,
    )


def create_hyde_task(agent: Agent, query: str) -> Task:

    return Task(
        name="HyDE Generation Task",
        description=HyDEPrompts.TASK_DESCRIPTION.format(query=query),
        expected_output=HyDEPrompts.TASK_EXPECTED_OUTPUT,
        agent=agent,
        output_pydantic=HyDEResponse,
    )
