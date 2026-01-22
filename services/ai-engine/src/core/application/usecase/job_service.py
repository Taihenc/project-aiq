from typing import List, Any
from datetime import datetime
from src.core.application.port.output.repository import (
    JobRepository,
    AgentRepository,
    ModelRepository,
    ToolRepository,
)
from src.core.application.port.output.job_executor import JobExecutorPort
from src.core.application.port.input.job_port import JobPort
from src.core.domain.model.job import Job
from src.core.application.dto.job import (
    CreateJobRequest,
    UpdateJobRequest,
    JobCompletionRequest,
    JobCompletionResponse,
)
from src.core.domain.exceptions import (
    EntityNotFoundException,
    DuplicateEntityException,
    InactiveEntityException,
)


class JobService(JobPort):
    """
    Service for managing Jobs.
    """

    def __init__(
        self,
        job_repository: JobRepository,
        agent_repository: AgentRepository,
        model_repository: ModelRepository,
        tool_repository: ToolRepository,
        job_executor: JobExecutorPort,
    ):
        self.job_repository = job_repository
        self.agent_repository = agent_repository
        self.model_repository = model_repository
        self.tool_repository = tool_repository
        self.job_executor = job_executor

    async def list_jobs(self) -> List[Job]:
        """
        List all registered jobs.
        """
        return await self.job_repository.list()

    async def get_job(self, job_id: str) -> Job:
        """
        Get a specific job by ID.
        """
        job = await self.job_repository.get(job_id)
        if not job:
            raise EntityNotFoundException(f"Job not found: {job_id}")
        return job

    async def create_job(self, request: CreateJobRequest) -> Job:
        """
        Create a new job.
        """
        # Check for duplicates by name
        existing_jobs = await self.job_repository.list()
        for j in existing_jobs:
            if j.name == request.name:
                raise DuplicateEntityException(
                    f"Job with name '{request.name}' already exists"
                )

        # Validate that the agent exists
        agent = await self.agent_repository.get(request.agent_id)
        if not agent:
            raise EntityNotFoundException(f"Agent not found: {request.agent_id}")

        job = Job(**request.model_dump())
        return await self.job_repository.create(job)

    async def update_job(self, job_id: str, request: UpdateJobRequest) -> Job:
        """
        Update an existing job definition.
        """
        existing = await self.job_repository.get(job_id)
        if not existing:
            raise EntityNotFoundException(f"Job not found: {job_id}")

        # Check for duplicates if name is changing
        if request.name is not None and request.name != existing.name:
            existing_jobs = await self.job_repository.list()
            for j in existing_jobs:
                if j.name == request.name:
                    raise DuplicateEntityException(
                        f"Job with name '{request.name}' already exists"
                    )

        # Validate that the agent exists if it's being updated
        if request.agent_id is not None:
            agent = await self.agent_repository.get(request.agent_id)
            if not agent:
                raise EntityNotFoundException(f"Agent not found: {request.agent_id}")

        update_data = request.model_dump(exclude_unset=True)
        updated_job = existing.model_copy(update=update_data)
        updated_job.updated_at = datetime.utcnow()

        return await self.job_repository.update(updated_job)

    async def delete_job(self, job_id: str) -> bool:
        """
        Delete a job.
        """
        existing = await self.job_repository.get(job_id)
        if not existing:
            raise EntityNotFoundException(f"Job not found: {job_id}")
        return await self.job_repository.delete(job_id)

    async def execute_job(
        self, job_id: str, request: JobCompletionRequest
    ) -> JobCompletionResponse:
        """
        Execute a job completion.
        """
        job = await self.job_repository.get(job_id)
        if not job:
            raise EntityNotFoundException(f"Job not found: {job_id}")

        # 1. Get Agent
        agent = await self.agent_repository.get(job.agent_id)
        if not agent:
            raise EntityNotFoundException(f"Agent not found: {job.agent_id}")

        # 2. Get Model
        model = await self.model_repository.get(agent.model_id)
        if not model:
            raise EntityNotFoundException(f"Model not found: {agent.model_id}")

        if not model.is_active:
            raise InactiveEntityException(f"Model is not active: {model.name}")

        # 3. Get Tools
        tools = []
        for tool_id in agent.tools:
            tool = await self.tool_repository.get(tool_id)
            if not tool:
                raise EntityNotFoundException(f"Tool not found: {tool_id}")
            tools.append(tool)

        # 4. Execute
        result, usage = await self.job_executor.execute_job(
            job=job,
            agent=agent,
            model=model,
            tools=tools,
            input_variables=request.inputs,
        )

        return JobCompletionResponse(result=result, usage=usage)
