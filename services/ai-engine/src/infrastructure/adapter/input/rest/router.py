from fastapi import APIRouter
from src.infrastructure.adapter.input.rest.v1 import (
    agents,
    llms,
    tools,
    jobs,
    workflows,
)

api_router = APIRouter()

api_router.include_router(llms.router, prefix="/models", tags=["Models"])
api_router.include_router(tools.router, prefix="/tools", tags=["Tools"])
api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
