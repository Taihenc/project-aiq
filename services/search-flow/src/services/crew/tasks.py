from crewai import Task, Agent
from src.config.prompts import TaskPrompts
from src.models.state import FlowResponse


def create_manager_task(agent: Agent, query: str, context_block: str) -> Task:
    return Task(
        name="Manager Task",
        description=TaskPrompts.MANAGER_TASK.format(
            query=query, context_block=context_block
        ),
        expected_output=TaskPrompts.MANAGER_OUTPUT,
        agent=agent,
        output_pydantic=FlowResponse,
    )
