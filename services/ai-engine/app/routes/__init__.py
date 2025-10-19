from fastapi import APIRouter
from .v1 import models, tools, agents, crews, completion

# from .v2 import models as v2_models, tools as v2_tools, agents as v2_agents, crews as v2_crews, completion as v2_completion

# v1 router
v1_router = APIRouter(prefix="/v1", tags=["v1"])
v1_router.include_router(models.router, prefix="/models", tags=["models"])
v1_router.include_router(tools.router, prefix="/tools", tags=["tools"])
v1_router.include_router(agents.router, prefix="/agents", tags=["agents"])
v1_router.include_router(crews.router, prefix="/crews", tags=["crews"])
v1_router.include_router(completion.router, prefix="/completion", tags=["completion"])

# v2 router (uncomment when v2 is ready)
# v2_router = APIRouter(prefix="/v2", tags=["v2"])
# v2_router.include_router(v2_models.router, prefix="/models", tags=["models"])
# v2_router.include_router(v2_tools.router, prefix="/tools", tags=["tools"])
# v2_router.include_router(v2_agents.router, prefix="/agents", tags=["agents"])
# v2_router.include_router(v2_crews.router, prefix="/crews", tags=["crews"])
# v2_router.include_router(v2_completion.router, prefix="/completion", tags=["completion"])

__all__ = ["v1_router"]  # "v2_router" when ready
