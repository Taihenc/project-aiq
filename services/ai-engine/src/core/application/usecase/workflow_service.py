from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from src.core.domain.model.workflow import Workflow
from src.core.domain.model.job import Job
from src.core.domain.model.agent import Agent
from src.core.domain.model.llm import Model
from src.core.domain.model.tool import Tool
from src.core.application.port.output.repository import (
    WorkflowRepository,
    JobRepository,
    AgentRepository,
    ModelRepository,
    ToolRepository,
)
from src.core.application.port.output.job_executor import JobExecutorPort
from src.core.application.dto.workflow import (
    CreateWorkflowRequest,
    UpdateWorkflowRequest,
    WorkflowCompletionRequest,
    WorkflowCompletionResponse,
)
from src.core.domain.exceptions import (
    EntityNotFoundException,
    DuplicateEntityException,
    InactiveEntityException,
)


class WorkflowService:
    """
    Service for managing Workflows.
    """

    def __init__(
        self,
        workflow_repository: WorkflowRepository,
        job_repository: JobRepository,
        agent_repository: AgentRepository,
        model_repository: ModelRepository,
        tool_repository: ToolRepository,
        job_executor: JobExecutorPort,
    ):
        self.workflow_repository = workflow_repository
        self.job_repository = job_repository
        self.agent_repository = agent_repository
        self.model_repository = model_repository
        self.tool_repository = tool_repository
        self.job_executor = job_executor

    async def list_workflows(self) -> List[Workflow]:
        return await self.workflow_repository.list()

    async def get_workflow(self, workflow_id: str) -> Workflow:
        workflow = await self.workflow_repository.get(workflow_id)
        if not workflow:
            raise EntityNotFoundException(f"Workflow not found: {workflow_id}")
        return workflow

    async def create_workflow(self, request: CreateWorkflowRequest) -> Workflow:
        # Check for duplicates by name
        existing_workflows = await self.workflow_repository.list()
        for w in existing_workflows:
            if w.name == request.name:
                raise DuplicateEntityException(
                    f"Workflow with name '{request.name}' already exists"
                )

        # Validate Jobs exist
        for job_id in request.tasks:
            job = await self.job_repository.get(job_id)
            if not job:
                raise EntityNotFoundException(f"Job not found: {job_id}")

        # Validate Manager Agent if sequential hierarchical
        if request.process == "hierarchical":
            if not request.manager_agent_id:
                # Manager is optional in CrewAI?
                # Ideally hierarchical needs a manager, but CrewAI can auto-create one (manager_llm).
                # For now let's allow it to be None, or enforce it if strictly required by our logic.
                # Let's enforce if the user wants to specify a specific manager agent.
                pass
            else:
                manager = await self.agent_repository.get(request.manager_agent_id)
                if not manager:
                    raise EntityNotFoundException(
                        f"Manager Agent not found: {request.manager_agent_id}"
                    )

        workflow = Workflow(**request.model_dump())
        return await self.workflow_repository.create(workflow)

    async def update_workflow(
        self, workflow_id: str, request: UpdateWorkflowRequest
    ) -> Workflow:
        existing = await self.workflow_repository.get(workflow_id)
        if not existing:
            raise EntityNotFoundException(f"Workflow not found: {workflow_id}")

        update_data = request.model_dump(exclude_unset=True)
        updated_workflow = existing.model_copy(update=update_data)
        updated_workflow.updated_at = datetime.now(timezone.utc)

        return await self.workflow_repository.update(updated_workflow)

    async def delete_workflow(self, workflow_id: str) -> bool:
        existing = await self.workflow_repository.get(workflow_id)
        if not existing:
            raise EntityNotFoundException(f"Workflow not found: {workflow_id}")
        return await self.workflow_repository.delete(workflow_id)

    async def execute_workflow(
        self, workflow_id: str, request: WorkflowCompletionRequest
    ) -> WorkflowCompletionResponse:
        workflow = await self.get_workflow(workflow_id)

        # 1. Fetch all Jobs
        jobs: List[Job] = []
        for job_id in workflow.tasks:
            job = await self.job_repository.get(job_id)
            if not job:
                raise EntityNotFoundException(f"Job not found: {job_id}")
            jobs.append(job)

        # 2. Fetch all Agents and their dependencies (Model, Tools)
        agents: Dict[str, Agent] = {}
        models: Dict[str, Model] = {}
        tools: Dict[str, Tool] = {}

        # Helper to fetch agent dependencies
        async def fetch_agent_deps(agent_id: str):
            if agent_id in agents:
                return

            agent = await self.agent_repository.get(agent_id)
            if not agent:
                raise EntityNotFoundException(f"Agent not found: {agent_id}")
            agents[agent_id] = agent

            # Model
            if agent.model_id not in models:
                model = await self.model_repository.get(agent.model_id)
                if not model:
                    raise EntityNotFoundException(f"Model not found: {agent.model_id}")
                if not model.is_active:
                    raise InactiveEntityException(f"Model is not active: {model.name}")
                models[agent.model_id] = model

            # Tools
            for tool_id in agent.tools:
                if tool_id not in tools:
                    tool = await self.tool_repository.get(tool_id)
                    if not tool:
                        raise EntityNotFoundException(f"Tool not found: {tool_id}")
                    tools[tool_id] = tool

        # Fetch for all jobs
        for job in jobs:
            await fetch_agent_deps(job.agent_id)

        # Fetch Manager Agent if exists
        manager_agent = None
        manager_model = None
        if workflow.manager_agent_id:
            await fetch_agent_deps(workflow.manager_agent_id)
            manager_agent = agents[workflow.manager_agent_id]
            manager_model = models[manager_agent.model_id]

        # 3. Execute
        result, usage = await self.job_executor.execute_workflow(
            workflow=workflow,
            jobs=jobs,
            agents=agents,
            models=models,
            tools=tools,
            input_variables=request.inputs,
            manager_agent=manager_agent,
            manager_model=manager_model,
        )

        return WorkflowCompletionResponse(result=result, usage=usage)

    async def execute_workflow_stream(
        self, workflow_id: str, request: WorkflowCompletionRequest
    ):
        workflow = await self.get_workflow(workflow_id)

        # 1. Fetch all Jobs
        jobs: List[Job] = []
        for job_id in workflow.tasks:
            job = await self.job_repository.get(job_id)
            if not job:
                raise EntityNotFoundException(f"Job not found: {job_id}")
            jobs.append(job)

        # 2. Fetch all Agents and their dependencies
        agents: Dict[str, Agent] = {}
        models: Dict[str, Model] = {}
        tools: Dict[str, Tool] = {}

        async def fetch_agent_deps(agent_id: str):
            if agent_id in agents:
                return
            agent = await self.agent_repository.get(agent_id)
            if not agent:
                raise EntityNotFoundException(f"Agent not found: {agent_id}")
            agents[agent_id] = agent

            if agent.model_id not in models:
                model = await self.model_repository.get(agent.model_id)
                if not model:
                    raise EntityNotFoundException(f"Model not found: {agent.model_id}")
                models[agent.model_id] = model

            for tool_id in agent.tools:
                if tool_id not in tools:
                    tool = await self.tool_repository.get(tool_id)
                    if not tool:
                        raise EntityNotFoundException(f"Tool not found: {tool_id}")
                    tools[tool_id] = tool

        for job in jobs:
            await fetch_agent_deps(job.agent_id)

        manager_agent = None
        manager_model = None
        if workflow.manager_agent_id:
            await fetch_agent_deps(workflow.manager_agent_id)
            manager_agent = agents[workflow.manager_agent_id]
            manager_model = models[manager_agent.model_id]

        # 3. Execute Stream
        # execute_workflow_stream is an async generator
        async for chunk in self.job_executor.execute_workflow_stream(
            workflow=workflow,
            jobs=jobs,
            agents=agents,
            models=models,
            tools=tools,
            input_variables=request.inputs,
            manager_agent=manager_agent,
            manager_model=manager_model,
        ):
            yield chunk
