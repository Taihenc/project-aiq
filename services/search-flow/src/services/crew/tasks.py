from crewai import Task, Agent
from src.config.prompts import TaskPrompts
from src.models.state import FlowResponse


def create_task(
    agent: Agent,
    mode: str,
    query: str,
    context_block: str,
    current_time: str,
    metadata: str = "",
    tools: list = [],
) -> Task:
    mode_rules = ""
    task_core = ""
    task_name = f"{mode.title()} Task"

    # Map the mode to the correct prompt constants
    if mode == "auto":
        mode_rules = TaskPrompts.AUTO_RULES
        task_core = TaskPrompts.AUTO_CORE_JOB
    elif mode == "search":
        mode_rules = TaskPrompts.SEARCH_RULES
        task_core = TaskPrompts.SEARCH_CORE_JOB
    elif mode == "lookup":
        mode_rules = TaskPrompts.LOOKUP_RULES
        task_core = TaskPrompts.LOOKUP_CORE_JOB
    elif mode == "chat":
        mode_rules = TaskPrompts.CHAT_RULES
        task_core = TaskPrompts.CHAT_CORE_JOB
    else:
        # Fallback to auto
        mode_rules = TaskPrompts.AUTO_RULES
        task_core = TaskPrompts.AUTO_CORE_JOB

    # Format the core job instruction with the query
    formatted_task_core = task_core.format(query=query)

    task_description = TaskPrompts.BASE_TASK_TEMPLATE.format(
        current_time=current_time,
        metadata=metadata,
        context_block=context_block,
        mode_rules=mode_rules,
        task_core=formatted_task_core,
    )

    return Task(
        name=task_name,
        description=task_description,
        expected_output=TaskPrompts.SEARCH_AGENT_OUTPUT,
        agent=agent,
        tools=tools,
        output_pydantic=FlowResponse,
    )
