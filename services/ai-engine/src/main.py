from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.infrastructure.config.settings import settings
from src.infrastructure.config.logging import setup_logging
from src.infrastructure.adapter.output.persistence.mongodb import mongodb_client
from src.infrastructure.adapter.output.messaging.redis import redis_client
from src.infrastructure.adapter.input.rest.router import api_router
from src.infrastructure.adapter.input.rest.exceptions import common_exception_handler
from fastapi import HTTPException


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    # Initialize Clients
    app.state.mongodb = mongodb_client.get_database()
    app.state.redis = await redis_client.get_client()

    yield

    # Cleanup
    mongodb_client.close()
    await redis_client.close()


app = FastAPI(
    title="AI Engine Service",
    description="Stateless Microservice for AI Workflows",
    version="0.1.0",
    debug=settings.debug,
    lifespan=lifespan,
)

app.include_router(api_router, prefix="/api/v1")

# Register Exception Handlers
app.add_exception_handler(HTTPException, common_exception_handler)


@app.get("/")
async def root():
    return {"message": "AI Engine Service is running"}
