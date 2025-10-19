"""
Application settings - ค่าทั้งหมดที่กำหนดใน settings เลย

ใช้ get_env สำหรับทุกค่า และมี list providers ได้เลย
"""

from .env import get_env, get_bool_env, get_environment


class Settings:
    """Settings class ที่กำหนดค่าทั้งหมดเลย"""

    # ============================================================================
    # General Settings
    # ============================================================================
    LOG_LEVEL = get_env("LOG_LEVEL", "INFO")
    DEBUG = get_bool_env("DEBUG", False)
    TIMEOUT = get_env("TIMEOUT", 30, int)

    # ============================================================================
    # Service Endpoints
    # ============================================================================
    EMBEDDING_SERVICE_URL = get_env(
        "EMBEDDING_SERVICE_URL", "http://embedding-service:8000"
    )
    CHAT_SERVICE_URL = get_env("CHAT_SERVICE_URL", "http://chat-service:8000")

    # ============================================================================
    # API Keys and Base URLs
    # ============================================================================
    AZURE_API_KEY = get_env("AZURE_API_KEY", "")
    AZURE_API_BASE = get_env("AZURE_API_BASE", "")
    AZURE_API_VERSION = get_env("AZURE_API_VERSION", "")

    # ============================================================================
    # Retrieval / RAG Settings
    # ============================================================================
    TOP_K = get_env("TOP_K", 5, int)
    RAG_SEARCH_LIMIT = get_env("RAG_SEARCH_LIMIT", 10, int)
    RERANK_TOP_N = get_env("RERANK_TOP_N", 5, int)

    # ============================================================================
    # Chat Completion Settings
    # ============================================================================
    DEFAULT_STREAM = get_bool_env("DEFAULT_STREAM", False)

    # ============================================================================
    # Available Providers
    # ============================================================================
    AVAILABLE_PROVIDERS = ["openai", "anthropic", "google", "ollama"]

    # ============================================================================
    # Models
    # ============================================================================
    MODELS = {
        "gpt-4o-mini": {
            "model": "gpt-4o-mini",
            "provider": "azure",
            "temperature": 0.7,
            "max_tokens": 4096,
            "top_p": 1.0,
        }
    }
    DEFAULT_MODEL = get_env("DEFAULT_MODEL", "gpt-4o-mini")

    # ============================================================================
    # Environment-specific overrides
    # ============================================================================
    def __init__(self):
        """Initialize with environment-specific overrides"""
        env = get_environment()

        if env == "development":
            self.DEBUG = True
            self.LOG_LEVEL = "DEBUG"
            self.TIMEOUT = 60
            self.DEFAULT_STREAM = False

        elif env == "staging":
            self.DEBUG = False
            self.LOG_LEVEL = "INFO"
            self.TIMEOUT = 45
            self.DEFAULT_STREAM = True

        elif env == "production":
            self.DEBUG = False
            self.LOG_LEVEL = "WARNING"
            self.TIMEOUT = 30
            self.DEFAULT_STREAM = True


# Create settings instance
settings = Settings()
