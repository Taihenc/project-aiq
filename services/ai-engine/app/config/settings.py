"""
Application settings - ค่าทั้งหมดที่กำหนดใน settings เลย

ใช้ get_env สำหรับทุกค่า และมี list providers ได้เลย
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Settings class ที่กำหนดค่าทั้งหมดเลย"""

    # ============================================================================
    # Helper Methods for Environment Variables
    # ============================================================================

    @staticmethod
    def get_env(name: str, default=None, cast=None):
        """Get environment variable with optional type casting"""
        value = os.getenv(name, default)
        if cast and value not in (None, ""):
            try:
                return cast(value)
            except Exception:
                raise ValueError(f"Cannot cast env var {name}={value} to {cast}")
        return value

    @staticmethod
    def get_bool_env(name: str, default=False):
        """Get boolean environment variable"""
        val = os.getenv(name)
        if val is None:
            return default
        return val.lower() in ["1", "true", "yes", "y", "on"]

    @staticmethod
    def get_environment():
        """Get current environment mode (development, staging, or production)"""
        return os.getenv("ENVIRONMENT", "development").lower()

    # ============================================================================
    # Available Providers
    # ============================================================================
    AVAILABLE_PROVIDERS = ["openai", "anthropic", "google", "ollama"]

    # ============================================================================
    # Environment-specific overrides
    # ============================================================================
    def __init__(self):
        """Initialize with environment-specific overrides"""
        # ============================================================================
        # General Settings
        # ============================================================================
        self.LOG_LEVEL = self.get_env("LOG_LEVEL", "INFO")
        self.DEBUG = self.get_bool_env("DEBUG", False)
        self.TIMEOUT = self.get_env("TIMEOUT", 30, int)

        # ============================================================================
        # Service Endpoints
        # ============================================================================
        self.EMBEDDING_SERVICE_URL = self.get_env(
            "EMBEDDING_SERVICE_URL", "http://embedding-service:8000"
        )
        self.CHAT_SERVICE_URL = self.get_env(
            "CHAT_SERVICE_URL", "http://chat-service:8000"
        )

        # ============================================================================
        # API Keys and Base URLs
        # ============================================================================
        self.AZURE_API_KEY = self.get_env("AZURE_API_KEY", "")
        self.AZURE_API_BASE = self.get_env("AZURE_API_BASE", "")
        self.AZURE_API_VERSION = self.get_env("AZURE_API_VERSION", "")

        # ============================================================================
        # Retrieval / RAG Settings
        # ============================================================================
        self.TOP_K = self.get_env("TOP_K", 5, int)
        self.RAG_SEARCH_LIMIT = self.get_env("RAG_SEARCH_LIMIT", 10, int)
        self.RERANK_TOP_N = self.get_env("RERANK_TOP_N", 5, int)

        # ============================================================================
        # Chat Completion Settings
        # ============================================================================
        self.DEFAULT_STREAM = self.get_bool_env("DEFAULT_STREAM", False)

        # ============================================================================
        # Models
        # ============================================================================
        self.DEFAULT_MODEL = self.get_env("DEFAULT_MODEL", "gpt-4o-mini")

        # Apply environment-specific overrides
        env = self.get_environment()

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
