from crewai import Task, Agent
from typing import List, Optional
from src.models.state import (
    ValidationOutput,
    FlowResponse,
    AskOutput,
    LookupOutput,
    SearchOutput,
)
from src.config.prompts import TaskPrompts


def create_validate_task(
    agent: Agent,
    query: str,
    context_str: str,
    history_str: str,
) -> Task:
    return Task(
        description=TaskPrompts.VALIDATE_CREW.format(
            query=query,
            context_str=context_str,
            history_str=history_str,
        ),
        expected_output=TaskPrompts.VALIDATE_CREW_OUTPUT,
        agent=agent,
        output_pydantic=ValidationOutput,
        name="validate_task",
    )


def create_ask_task(
    agent: Agent,
    intent: str,
    context_str: str,
    language: str,
) -> Task:
    return Task(
        description=TaskPrompts.ASK_CREW.format(
            intent=intent,
            context_str=context_str,
            language=language,
        ),
        expected_output=TaskPrompts.ASK_CREW_OUTPUT,
        agent=agent,
        output_pydantic=AskOutput,  # Use specific output
        name="ask_task",
    )


def create_lookup_task(
    agent: Agent,
    intent: str,
    context_str: str,
    language: str,
) -> Task:
    return Task(
        description=TaskPrompts.LOOKUP_CREW.format(
            intent=intent,
            context_str=context_str,
            language=language,
        ),
        expected_output=TaskPrompts.LOOKUP_CREW_OUTPUT,
        agent=agent,
        output_pydantic=LookupOutput,
        name="lookup_task",
    )


def create_search_sim_task(
    agent: Agent,
    intent: str,
    context_str: str,
    language: str,
) -> Task:
    return Task(
        description=TaskPrompts.SEARCH_SIMULATOR_TASK.format(
            intent=intent,
            context_str=context_str,
            language=language,
        ),
        expected_output=TaskPrompts.SEARCH_SIMULATOR_OUTPUT,
        agent=agent,
        name="search_sim_task",
    )


def create_search_exec_task(
    agent: Agent,
    input_prev_task: Task,  # Output from sim task
    intent: str,
) -> Task:
    return Task(
        description=TaskPrompts.SEARCH_EXECUTION_TASK.format(
            intent=intent,
        ),
        expected_output=TaskPrompts.SEARCH_EXECUTION_OUTPUT,
        agent=agent,
        context=[input_prev_task],
        name="search_exec_task",
    )


def create_search_verify_task(
    agent: Agent,
    input_prev_task: Task,  # Output from exec task
    intent: str,
    language: str,
) -> Task:
    return Task(
        description=TaskPrompts.SEARCH_VERIFY_TASK.format(
            intent=intent,
            language=language,
        ),
        expected_output=TaskPrompts.SEARCH_VERIFY_OUTPUT,
        agent=agent,
        context=[input_prev_task],
        output_pydantic=SearchOutput,
        name="search_verify_task",
    )
