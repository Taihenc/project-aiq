from fastapi import FastAPI
from app.routes import v1_router

app = FastAPI(title="AI Engine Service", version="1.0.0")

# include API versions
app.include_router(v1_router)
# app.include_router(v2_router)  # uncomment when v2 is ready


@app.get("/")
async def root():
    return {"message": "AI Engine Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-engine"}
