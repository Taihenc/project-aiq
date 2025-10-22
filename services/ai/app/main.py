from fastapi import FastAPI
from app.routers.v1 import chat, embedding
from app.config import settings
import logging
from pydantic_settings import BaseSettings

app = FastAPI(
    title=settings.APP_NAME,
    description="AI and RAG service for project-aiq",
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Include routers
app.include_router(chat.router, prefix="/v1/chat", tags=["chat-v1"])
app.include_router(embedding.router, prefix="/v1/embedding", tags=["embedding-v1"])


# Configure logging with colors
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="[%(asctime)s - %(name)s - %(levelname)s]\n %(message)s",
    style="%",
)
# Color mapping for log levels
LOG_COLORS = {
    "DEBUG": "\033[96m",  # ฟ้าสว่าง (Light Cyan)
    "INFO": "\033[92m",  # เขียวสว่าง (Light Green)
    "WARNING": "\033[93m",  # เหลืองสว่าง (Light Yellow)
    "ERROR": "\033[91m",  # แดงสว่าง (Light Red)
    "CRITICAL": "\033[95m",  # ม่วงสว่าง (Light Magenta)
}
RESET = "\033[0m"

for h in logging.getLogger().handlers:
    h.addFilter(
        lambda r: setattr(
            r,
            "levelname",
            f"{LOG_COLORS.get(r.levelname, '')}{r.levelname}{RESET}",
        )
        or True
    )
logging.info(
    f"🚀 Running with {LOG_COLORS.get(settings.LOG_LEVEL, '')}{settings.LOG_LEVEL}{RESET} level"
)


@app.get("/")
async def root():
    """🏠 Root endpoint - Welcome to AI Service"""
    return {
        "message": f"🎉 {settings.APP_NAME} is running smoothly! 🚀",
        "version": settings.APP_VERSION,
        "status": "✅ Active",
        "api_versions": ["v1"],
        "endpoints": {"v1": {"chat": "/v1/chat", "embedding": "/v1/embedding"}},
        "description": "🤖 AI and RAG service for project-aiq",
    }
