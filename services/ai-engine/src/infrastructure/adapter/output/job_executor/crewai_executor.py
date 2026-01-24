from typing import Any, Dict, List, Type
from pydantic import BaseModel, create_model
from crewai import Agent as CrewAgent, Task as CrewTask, Crew, Process
from src.core.application.port.output.job_executor import JobExecutorPort
from src.core.domain.model.job import Job
from src.core.domain.model.agent import Agent
from src.core.domain.model.llm import Model
from src.core.domain.model.tool import Tool
from src.core.domain.model.workflow import Workflow
from typing import Optional
from src.infrastructure.adapter.output.llm_provider.crewai_provider import (
    CrewAILLMProvider,
)
from crewai.mcp import MCPServerSSE

from crewai.mcp import MCPServerSSE

# from crewai.tools.structured_tool import CrewStructuredTool
# from langchain.tools import StructuredTool
from crewai.tools import tool as crewai_tool
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
        All fields are made Optional to handle LLM output variations robustly.
        """
        field_definitions = {}
        for fname, ftype in fields.items():
            if ftype == "str":
                field_definitions[fname] = (Optional[str], None)
            elif ftype == "int":
                field_definitions[fname] = (Optional[int], None)
            elif ftype == "float":
                field_definitions[fname] = (Optional[float], None)
            elif ftype == "bool":
                field_definitions[fname] = (Optional[bool], None)
            elif ftype == "list[str]":
                field_definitions[fname] = (Optional[List[str]], None)
            elif ftype == "list[int]":
                field_definitions[fname] = (Optional[List[int]], None)
            else:
                # Fallback to str
                field_definitions[fname] = (Optional[str], None)

        return create_model(model_name, **field_definitions)

    def _prepare_tools_and_mcps(self, tools: List[Tool]):
        crew_tools = []
        mcps = []

        for tool in tools:
            if tool.type == "REST":
                # Create dynamic args schema
                args_schema = self._create_dynamic_model(
                    f"{tool.name}Args", tool.parameters or {}
                )

                # Placeholder function for REST call
                def _create_runner(t: Tool):
                    def _run_tool(**kwargs):
                        # Merge default parameters (system injected) with agent parameters (kwargs)
                        # User guaranteed no overlap, but we merge defaults first then kwargs just in case
                        final_args = (
                            t.default_parameters.copy() if t.default_parameters else {}
                        )
                        final_args.update(kwargs)

                        try:
                            import httpx

                            # Assuming POST for search/action tools by default or we could add method to Tool model later
                            # Using json=final_args for body
                            response = httpx.post(
                                t.endpoint, json=final_args, timeout=60.0
                            )
                            response.raise_for_status()
                            return response.text
                        except Exception as e:
                            return f"Error executing tool {t.name}: {str(e)}"

                    return _run_tool

                # Create dynamic tool using crewai.tools.tool decorator logic?
                # Actually, the most robust way in CrewAI to create a tool from function dynamically
                # without decorator syntax is likely using the Tool class directly if available.
                # However, the user suggested `Tool.from_function` or `@tool`.
                # Let's try creating a class that inherits from BaseTool or using Tool class.

                # Import inside method or at top? Let's assume Tool is available from crewai.tools
                from crewai.tools.base_tool import Tool as CrewTool

                # Create runner
                runner_func = _create_runner(tool)

                # Create CrewTool
                # CrewAI Tool class typically takes name, func, description
                structured_tool = CrewTool(
                    name=tool.name,
                    description=tool.description,
                    func=runner_func,
                    args_schema=args_schema,
                )
                crew_tools.append(structured_tool)

            elif tool.type == "MCP_SSE":
                # Create MCP Server connection
                headers = tool.auth_config if tool.auth_config else {}
                mcp_server = MCPServerSSE(url=tool.endpoint, headers=headers)
                mcps.append(mcp_server)

        return crew_tools, mcps

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
        # 2. Prepare Tools and MCPs
        crew_tools, mcps = self._prepare_tools_and_mcps(tools)

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

    async def execute_workflow(
        self,
        workflow: Workflow,
        jobs: List[Job],
        agents: Dict[str, Agent],
        models: Dict[str, Model],
        tools: Dict[str, Tool],
        input_variables: Dict[str, Any],
        manager_agent: Optional[Agent] = None,
        manager_model: Optional[Model] = None,
    ) -> Any:
        # Cache for created Crew Agents: agent_id -> CrewAgent
        created_agents: Dict[str, CrewAgent] = {}

        # 1. Create Agents
        # We iterate over unique agents present in the jobs
        for agent_id, agent in agents.items():
            model = models.get(agent.model_id)
            if not model:
                continue  # Should be validated in service

            llm = self.llm_provider.get_llm(model)

            # Resolve tools for this agent
            agent_tools = []
            for t_id in agent.tools:
                if t_id in tools:
                    agent_tools.append(tools[t_id])

            crew_tools, mcps = self._prepare_tools_and_mcps(agent_tools)

            crew_agent = CrewAgent(
                role=agent.role,
                goal=agent.goal,
                backstory=agent.backstory,
                llm=llm,
                tools=crew_tools,
                verbose=settings.debug,
                allow_delegation=False,
            )
            # Inject MCPs if present
            if mcps:
                # Re-instantiate with mcps
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
            created_agents[agent_id] = crew_agent

        # 2. Create Tasks
        crew_tasks = []
        for job in jobs:
            if job.agent_id not in created_agents:
                continue  # Should be validated

            crew_agent = created_agents[job.agent_id]

            output_pydantic = None
            if job.output_pydantic:
                output_pydantic = self._create_dynamic_model(
                    f"{job.name}Output", job.output_pydantic
                )

            task = CrewTask(
                description=job.task_description,
                expected_output=job.expected_output,
                agent=crew_agent,
                output_pydantic=output_pydantic,
            )
            crew_tasks.append(task)

        # 3. Configure Manager (if hierarchical)
        manager_llm = None
        crew_manager_agent = None

        if workflow.process == "hierarchical":
            if manager_agent and manager_model:
                # 1. Prepare LLM
                manager_llm_instance = self.llm_provider.get_llm(manager_model)

                # 2. Resolve tools
                manager_tools = []
                for t_id in manager_agent.tools:
                    if t_id in tools:
                        manager_tools.append(tools[t_id])

                # 3. Prepare Tools and MCPs
                crew_cols, mcps = self._prepare_tools_and_mcps(manager_tools)

                # 4. Create Manager Agent
                crew_manager_agent = CrewAgent(
                    role=manager_agent.role,
                    goal=manager_agent.goal,
                    backstory=manager_agent.backstory,
                    llm=manager_llm_instance,
                    tools=crew_cols,
                    verbose=settings.debug,
                    allow_delegation=True,  # Manager typically delegates
                )

                if mcps:
                    crew_manager_agent = CrewAgent(
                        role=manager_agent.role,
                        goal=manager_agent.goal,
                        backstory=manager_agent.backstory,
                        llm=manager_llm_instance,
                        tools=crew_cols,
                        verbose=settings.debug,
                        allow_delegation=True,
                        mcps=mcps,
                    )

            elif manager_model:
                # Fallback to just LLM if no full agent definition
                manager_llm = self.llm_provider.get_llm(manager_model)

        # 4. Create Crew
        process_type = (
            Process.hierarchical
            if workflow.process == "hierarchical"
            else Process.sequential
        )

        args = {
            "agents": list(created_agents.values()),
            "tasks": crew_tasks,
            "process": process_type,
            "verbose": True,
        }

        if process_type == Process.hierarchical:
            if crew_manager_agent:
                args["manager_agent"] = crew_manager_agent
            elif manager_llm:
                args["manager_llm"] = manager_llm

        crew = Crew(**args)
        result = crew.kickoff(inputs=input_variables)

        # 5. Extract Metrics
        usage_metrics = {}
        if hasattr(result, "token_usage"):
            metrics = result.token_usage
            usage_metrics = {
                "total_tokens": getattr(metrics, "total_tokens", 0),
                "prompt_tokens": getattr(metrics, "prompt_tokens", 0),
                "completion_tokens": getattr(metrics, "completion_tokens", 0),
                "successful_requests": getattr(metrics, "successful_requests", 0),
            }

        output_content = result.raw
        # Handle pydantic output from the LAST task if applicable?
        # CrewOutput usually contains the result of the last task.
        if hasattr(result, "pydantic") and result.pydantic:
            output_content = result.pydantic

        return output_content, usage_metrics
