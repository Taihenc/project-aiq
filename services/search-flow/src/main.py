from fastapi import FastAPI
from src.infrastructure.config.settings import settings
from src.infrastructure.adapter.input.rest.router import router as search_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Search Flow Service",
        description="Microservice for Search Flow using CrewAI (Hexagonal Architecture)",
        version="0.1.0",
        debug=True,  # Can be toggle via settings
    )

    app.include_router(search_router, prefix="/api/v1/search", tags=["Search"])

    @app.get("/")
    async def root():
        return {"message": "Search Flow Service is running"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
