from crewai import Task, Agent
from src.config.prompts import TaskPrompts
from src.models.state import FlowResponse


def create_search_task(
    agent: Agent,
    query: str,
    context_block: str,
    current_time: str,
    mode_instruction: str = "",
    metadata: str = "",
) -> Task:
    return Task(
        name="Search Agent Task",
        description=TaskPrompts.SEARCH_AGENT_TASK_TEMPLATE.format(
            query=query,
            context_block=context_block,
            mode_instruction=mode_instruction,
            metadata=metadata,
            current_time=current_time,
        ),
        expected_output=TaskPrompts.SEARCH_AGENT_OUTPUT,
        agent=agent,
        output_pydantic=FlowResponse,
    )
