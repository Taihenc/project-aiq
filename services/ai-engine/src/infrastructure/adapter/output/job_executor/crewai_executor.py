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
        field_definitions: Dict[str, Any] = {}
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
        # Handle pydantic output from the last task if applicable?
        if hasattr(result, "pydantic") and result.pydantic:
            output_content = result.pydantic

        return output_content, usage_metrics

    async def execute_workflow_stream(
        self,
        workflow: Workflow,
        jobs: List[Job],
        agents: Dict[str, Agent],
        models: Dict[str, Model],
        tools: Dict[str, Tool],
        input_variables: Dict[str, Any],
        manager_agent: Optional[Agent] = None,
        manager_model: Optional[Model] = None,
    ):
        import queue
        import threading
        import json
        import asyncio

        event_queue: queue.Queue = queue.Queue()

        def agent_step_callback(step):
            # Capture agent actions/tool usage
            try:
                # step structure varies significantly between CrewAI versions
                # Sometimes it's a list of actions, sometimes an object
                agent_name = "AI Agent"
                message = "Analyzing next step..."

                # Try to extract info from step object or dict
                if isinstance(step, list) and len(step) > 0:
                    step = step[0]

                # Check for agent identifier
                for attr in ["agent", "role", "agent_name"]:
                    val = getattr(step, attr, None)
                    if val:
                        agent_name = val
                        break

                # Check for tool usage
                tool_name = getattr(step, "tool", None)
                if not tool_name and hasattr(step, "__getitem__"):
                    try: tool_name = step.get("tool")
                    except: pass

                if tool_name:
                    # Clean up tool name (e.g., google_search -> Google Search)
                    friendly_tool_name = tool_name.replace('_', ' ').title()

                    message = f"{agent_name} is using {friendly_tool_name}"

                    # Try to get tool input
                    tool_input = getattr(step, "tool_input", None)
                    if not tool_input and hasattr(step, "__getitem__"):
                        try: tool_input = step.get("tool_input")
                        except: pass

                    if tool_input:
                        input_str = str(tool_input)
                        parsed_input = None

                        # Try to parse if it's a string looking like a dict/json
                        if isinstance(tool_input, str):
                            tool_input = tool_input.strip()
                            if tool_input.startswith('{') and tool_input.endswith('}'):
                                try:
                                    parsed_input = json.loads(tool_input)
                                except json.JSONDecodeError:
                                    try:
                                        import ast
                                        parsed_input = ast.literal_eval(tool_input)
                                    except:
                                        pass
                        elif isinstance(tool_input, dict):
                            parsed_input = tool_input

                        # Extract values if we have a dict
                        if parsed_input and isinstance(parsed_input, dict):
                            # Filter out empty values and join
                            values = [str(v) for v in parsed_input.values() if v]
                            if values:
                                input_str = ", ".join(values)
                        elif parsed_input:
                             input_str = str(parsed_input)

                        # Clean up technical characters
                        input_str = input_str.replace('{', '').replace('}', '').replace('"', '').replace("'", "")

                        # Remove newlines and extra spaces
                        input_str = " ".join(input_str.split())

                        if len(input_str) > 50:
                            input_str = input_str[:47] + "..."

                        if input_str:
                            message += f": {input_str}"
                else:
                    # Look for thought or text
                    thought = None
                    for attr in ["text", "thought", "output"]:
                        val = getattr(step, attr, None)
                        if val and isinstance(val, str):
                            thought = val.strip()
                            break

                    if thought:
                        # Clean up formatting for thought
                        thought = thought.replace('\n', ' ').strip()
                        if len(thought) > 100:
                            thought = thought[:97] + "..."
                        message = f"{agent_name}: {thought}"
                    else:
                        message = f"{agent_name} is thinking..."

                if settings.debug:
                    print(f"DEBUG: Agent Step -> {message}")

                event_queue.put({"type": "status", "content": message})
            except Exception as e:
                if settings.debug:
                    print(f"DEBUG: Error in agent_step_callback: {str(e)}")
                event_queue.put({"type": "status", "content": "AI is working..."})

        def task_callback(task_output):
            # Captured after each task completes
            try:
                msg = "Task completed."
                # task_output is usually a TaskOutput object
                if hasattr(task_output, "description"):
                    desc = task_output.description
                    if len(desc) > 50:
                        desc = desc[:47] + "..."
                    msg = f"Completed task: {desc}"

                if settings.debug:
                    print(f"DEBUG: Task Output -> {msg}")
                event_queue.put({"type": "status", "content": msg})
            except Exception:
                pass

        # Cache for created Crew Agents
        created_agents: Dict[str, CrewAgent] = {}

        # 1. Create Agents with callback
        for agent_id, agent in agents.items():
            model = models.get(agent.model_id)
            if not model:
                continue
            llm = self.llm_provider.get_llm(model)
            agent_tools = [tools[t_id] for t_id in agent.tools if t_id in tools]
            crew_tools, mcps = self._prepare_tools_and_mcps(agent_tools)

            agent_args = {
                "role": agent.role,
                "goal": agent.goal,
                "backstory": agent.backstory,
                "llm": llm,
                "tools": crew_tools,
                "verbose": settings.debug,
                "allow_delegation": False,
                "step_callback": agent_step_callback,
            }
            if mcps:
                agent_args["mcps"] = mcps

            created_agents[agent_id] = CrewAgent(**agent_args)

        # 2. Create Tasks with callback
        crew_tasks = []
        for job in jobs:
            if job.agent_id not in created_agents:
                continue
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
                callback=task_callback,
            )
            crew_tasks.append(task)

        # 3. Configure Manager
        manager_llm = None
        crew_manager_agent = None
        if workflow.process == "hierarchical":
            if manager_agent and manager_model:
                manager_llm_instance = self.llm_provider.get_llm(manager_model)
                manager_agent_tools = [
                    tools[t_id] for t_id in manager_agent.tools if t_id in tools
                ]
                crew_cols, manager_mcps = self._prepare_tools_and_mcps(manager_agent_tools)

                mgr_args = {
                    "role": manager_agent.role,
                    "goal": manager_agent.goal,
                    "backstory": manager_agent.backstory,
                    "llm": manager_llm_instance,
                    "tools": crew_cols,
                    "verbose": settings.debug,
                    "allow_delegation": True,
                    "step_callback": agent_step_callback,
                }
                if manager_mcps:
                    mgr_args["mcps"] = manager_mcps
                crew_manager_agent = CrewAgent(**mgr_args)
            elif manager_model:
                manager_llm = self.llm_provider.get_llm(manager_model)

        # 4. Create Crew
        process_type = (
            Process.hierarchical
            if workflow.process == "hierarchical"
            else Process.sequential
        )
        crew_args = {
            "agents": list(created_agents.values()),
            "tasks": crew_tasks,
            "process": process_type,
            "verbose": True,
            # We can also add task_callback at crew level in some versions
            "task_callback": task_callback,
        }
        if process_type == Process.hierarchical:
            if crew_manager_agent:
                crew_args["manager_agent"] = crew_manager_agent
            elif manager_llm:
                crew_args["manager_llm"] = manager_llm

        crew = Crew(**crew_args)

        # Send initial status
        event_queue.put({"type": "status", "content": "Starting Crew execution..."})

        # 5. Background Kickoff
        def run_kickoff():
            try:
                result = crew.kickoff(inputs=input_variables)

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
                if hasattr(result, "pydantic") and result.pydantic:
                    output_content = result.pydantic

                # Wrap final result
                final_payload = {
                    "type": "result",
                    "content": output_content,
                    "usage": usage_metrics,
                }
                event_queue.put(final_payload)
            except Exception as e:
                import traceback
                traceback.print_exc()
                event_queue.put({"type": "error", "content": f"Crew execution failed: {str(e)}"})
            finally:
                # Sentinel to indicate end of stream
                event_queue.put(None)

        thread = threading.Thread(target=run_kickoff)
        thread.start()

        def json_serializer(obj):
            """JSON serializer for objects not serializable by default json code"""
            if isinstance(obj, BaseModel):
                return obj.model_dump()
            if hasattr(obj, "model_dump"):
                return obj.model_dump()
            if hasattr(obj, "dict"):
                return obj.dict()
            return str(obj)

        # 6. Yield from queue
        while True:
            try:
                event = event_queue.get_nowait()
                if event is None:
                    if settings.debug: print("DEBUG: SSE Stream Finished (Sentinel received)")
                    break

                payload = json.dumps(event, default=json_serializer)
                if settings.debug: print(f"DEBUG: Yielding SSE Event -> {payload[:100]}...")
                yield payload + "\n"
            except queue.Empty:
                await asyncio.sleep(0.1)
                continue
