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
from crewai.mcp import MCPServerSSE
from crewai.tools.structured_tool import CrewStructuredTool
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

        # 2. Prepare Tools and MCPs
        crew_tools = []
        mcps = []

        for tool in tools:
            if tool.type == "REST":
                # Create dynamic args schema
                args_schema = self._create_dynamic_model(
                    f"{tool.name}Args", tool.parameters or {}
                )

                # Placeholder function for REST call
                # In a real scenario, this would perform an HTTP request
                def _create_runner(t: Tool):
                    def _run_tool(**kwargs):
                        return f"Executed {t.name} at {t.endpoint} with args: {kwargs}"

                    return _run_tool

                # Create StructuredTool
                structured_tool = CrewStructuredTool.from_function(
                    func=_create_runner(tool),
                    name=tool.name,
                    description=tool.description,
                    args_schema=args_schema,
                )
                crew_tools.append(structured_tool)

            elif tool.type == "MCP_SSE":
                # Create MCP Server connection
                # Extract headers from auth_config if present
                headers = tool.auth_config if tool.auth_config else {}

                mcp_server = MCPServerSSE(url=tool.endpoint, headers=headers)
                mcps.append(mcp_server)

        # 3. Create CrewAI Agent
        crew_agent = CrewAgent(
            role=agent.role,
            goal=agent.goal,
            backstory=agent.backstory,
            llm=llm,
            tools=crew_tools,
            verbose=settings.debug,
            allow_delegation=False,
            # Pass MCP servers if any
            # Note: The underlying Agent must support the 'mcps' argument dynamically
            # if using an older version of CrewAI that doesn't explicitly type hint it,
            # but User info suggests it is supported.
        )
        # Manually injection if not supported in constructor directly or typed
        if mcps:
            # Based on user example: mcps=[remote_mcp] in constructor
            # Re-instantiate or use **kwargs if needed, but assuming standard init:
            crew_agent = CrewAgent(
                role=agent.role,
                goal=agent.goal,
                backstory=agent.backstory,
                llm=llm,
                tools=crew_tools,
                verbose=settings.debug,
                allow_delegation=False,
                mcps=mcps,
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
