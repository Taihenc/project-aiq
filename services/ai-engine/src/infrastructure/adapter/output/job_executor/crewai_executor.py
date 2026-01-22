from typing import Any, Dict, List, Type
from pydantic import BaseModel, create_model
from crewai import Agent as CrewAgent, Task as CrewTask, Crew
from src.core.application.port.output.job_executor import JobExecutorPort
from src.core.domain.model.job import Job
from src.core.domain.model.agent import Agent
from src.core.domain.model.llm import Model
from src.core.domain.model.tool import Tool
from src.infrastructure.adapter.output.llm_provider.crewai_provider import (
    CrewAILLMProvider,
)
from src.infrastructure.config.settings import settings


class CrewAIJobExecutor(JobExecutorPort):
    def __init__(self, llm_provider: CrewAILLMProvider):
        self.llm_provider = llm_provider

    def _create_dynamic_model(
        self, model_name: str, fields: Dict[str, str]
    ) -> Type[BaseModel]:
        """
        Create a dynamic Pydantic model from dictionary definition.
        Supported types: 'str', 'int', 'float', 'bool', 'list[str]', 'list[int]'
        """
        field_definitions = {}
        for fname, ftype in fields.items():
            if ftype == "str":
                field_definitions[fname] = (str, ...)
            elif ftype == "int":
                field_definitions[fname] = (int, ...)
            elif ftype == "float":
                field_definitions[fname] = (float, ...)
            elif ftype == "bool":
                field_definitions[fname] = (bool, ...)
            elif ftype == "list[str]":
                field_definitions[fname] = (List[str], ...)
            elif ftype == "list[int]":
                field_definitions[fname] = (List[int], ...)
            else:
                # Fallback to str
                field_definitions[fname] = (str, ...)

        return create_model(model_name, **field_definitions)

    async def execute_job(
        self,
        job: Job,
        agent: Agent,
        model: Model,
        tools: List[Tool],
        input_variables: Dict[str, Any],
    ) -> Any:
        # 1. Prepare LLM
        llm = self.llm_provider.get_llm(model)

        # 2. Prepare Tools (Placeholder: Tool conversion logic needed here)
        # For now, we pass empty list as we haven't implemented Tool->LangChain tool conversion yet
        crew_tools = []

        # 3. Create CrewAI Agent
        crew_agent = CrewAgent(
            role=agent.role,
            goal=agent.goal,
            backstory=agent.backstory,
            llm=llm,
            tools=crew_tools,
            verbose=settings.debug,
            allow_delegation=False,
        )

        # 4. Prepare Output Model if configured
        output_pydantic = None
        if job.output_pydantic:
            output_pydantic = self._create_dynamic_model(
                f"{job.name}Output", job.output_pydantic
            )

        # 5. Create CrewAI Task
        crew_task = CrewTask(
            description=job.task_description,
            expected_output=job.expected_output,
            agent=crew_agent,
            output_pydantic=output_pydantic,
        )

        # 6. Create Crew and Kickoff
        crew = Crew(agents=[crew_agent], tasks=[crew_task], verbose=True)

        result = crew.kickoff(inputs=input_variables)

        # Extract usage metrics
        usage_metrics = {}
        if hasattr(result, "token_usage"):
            metrics = result.token_usage
            # Robust extraction of known fields
            usage_metrics = {
                "total_tokens": getattr(metrics, "total_tokens", 0),
                "prompt_tokens": getattr(metrics, "prompt_tokens", 0),
                "completion_tokens": getattr(metrics, "completion_tokens", 0),
                "successful_requests": getattr(metrics, "successful_requests", 0),
            }

        output_content = result.raw
        # If output_pydantic was used, result might be a Pydantic object or dict
        if output_pydantic and hasattr(result, "pydantic") and result.pydantic:
            output_content = result.pydantic

        return output_content, usage_metrics
