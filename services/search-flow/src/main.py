from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.config.settings import settings
from src.config.logging import setup_logging
from src.routers.search import router as search_router
from src.services.langfuse_service import LangfuseService


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    # Langfuse Setup
    langfuse = LangfuseService().setup()
    langfuse.flush()

    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Search Flow Service",
        description="Microservice for Search Flow using CrewAI",
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.include_router(search_router, prefix="/api/v1", tags=["Search"])

    @app.get("/")
    async def root():
        return {"message": "Search Flow Service is running"}

    return app


app = create_app()
