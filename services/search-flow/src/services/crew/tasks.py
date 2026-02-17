from crewai import Task, Agent
from src.config.prompts import TaskPrompts, AgentPrompts
from src.models.state import FlowResponse


def create_manager_task(
    agent: Agent, query: str, context_str: str, history_str: str
) -> Task:
    return Task(
        description=TaskPrompts.MANAGER_TASK.format(
            query=query, attachments_str=context_str, history_str=history_str
        ),
        expected_output=TaskPrompts.MANAGER_OUTPUT,
        agent=agent,
        output_pydantic=FlowResponse,
    )
