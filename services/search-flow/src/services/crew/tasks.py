from crewai import Task, Agent
from typing import List, Optional
from src.models.state import IntentOutput, CapabilityPlan, FlowResponse
from src.config.settings import ORGANIZATION_CONTEXT
from src.config.prompts import TaskPrompts


def create_classify_intent_task(agent: Agent, query: str) -> Task:
    return Task(
        description=TaskPrompts.CLASSIFY_INTENT.format(
            query=query, organization_context=ORGANIZATION_CONTEXT
        ),
        expected_output="IntentOutput JSON",
        agent=agent,
        output_pydantic=IntentOutput,
    )


def create_plan_capabilities_task(agent: Agent, query: str, context_str: str) -> Task:
    return Task(
        description=TaskPrompts.PLAN_CAPABILITIES.format(
            query=query, context_str=context_str
        ),
        expected_output="CapabilityPlan JSON",
        agent=agent,
        output_pydantic=CapabilityPlan,
    )


def create_transform_query_task(agent: Agent, query: str) -> Task:
    return Task(
        description=TaskPrompts.TRANSFORM_QUERY.format(query=query),
        expected_output="A single rephrased question string.",
        agent=agent,
    )


def create_hyde_generation_task(agent: Agent, context_task: Task) -> Task:
    return Task(
        description=TaskPrompts.HYDE_GENERATION,
        expected_output="A comprehensive hypothetical answer paragraph.",
        agent=agent,
        context=[context_task],
    )


def create_execute_search_task(
    agent: Agent, query: str, intent_action: str, context_str: str, history_str: str
) -> Task:
    return Task(
        description=TaskPrompts.EXECUTE_SEARCH.format(
            query=query,
            intent_action=intent_action,
            context_str=context_str,
            history_str=history_str,
        ),
        expected_output="FlowResponse JSON",
        agent=agent,
        output_pydantic=FlowResponse,
    )
