"""
Application settings with default values.

Use this class to access default configurations throughout the app.
Add constants here for easier maintenance and centralized configuration.
"""

from typing import Dict, List, Optional
from .env import get_env, get_bool_env, get_environment


class ModelConfig:
    """Configuration for a specific model"""

    def __init__(
        self,
        model: str,
        temperature: float,
        max_tokens: int,
    ):
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens


class ProviderConfig:
    """Configuration for a specific LLM provider with multiple models"""

    def __init__(
        self,
        provider: str,
        default_model: str,
        models: Dict[str, ModelConfig],
    ):
        self.provider = provider
        self.default_model = default_model
        self.models = models

    def get_model_config(self, model_name: Optional[str] = None) -> ModelConfig:
        """Get configuration for a specific model or default model"""
        if model_name is None:
            model_name = self.default_model
        return self.models.get(model_name, self.models[self.default_model])

    def get_all_models(self) -> List[str]:
        """Get list of all available models for this provider"""
        return list(self.models.keys())


# Provider configurations with multiple models support
PROVIDER_CONFIGS: Dict[str, ProviderConfig] = {
    "openai": ProviderConfig(
        provider="openai",
        default_model="gpt-4o-mini",
        models={
            "gpt-4o-mini": ModelConfig(
                model="gpt-4o-mini",
                temperature=0.7,
                max_tokens=4096,
            )
        },
    ),
    "anthropic": ProviderConfig(
        provider="anthropic",
        default_model="claude-3-haiku-20240307",
        models={
            "claude-3-haiku-20240307": ModelConfig(
                model="claude-3-haiku-20240307",
                temperature=0.7,
                max_tokens=4096,
            ),
        },
    ),
    "google": ProviderConfig(
        provider="google",
        default_model="gemini-2.0-flash-exp",
        models={
            "gemini-2.0-flash-exp": ModelConfig(
                model="gemini-2.0-flash-exp",
                temperature=0.7,
                max_tokens=8192,
            ),
        },
    ),
    "ollama": ProviderConfig(
        provider="ollama",
        default_model="llama3.2",
        models={
            "llama3.2": ModelConfig(
                model="llama3.2",
                temperature=0.7,
                max_tokens=2048,
            ),
        },
    ),
}


class BaseSettings:
    """Base settings class that loads all configuration from environment variables"""

    # --- General ---
    LOG_LEVEL = get_env("LOG_LEVEL", "INFO")
    DEBUG = get_bool_env("DEBUG", False)
    TIMEOUT = get_env("TIMEOUT", 30, int)

    # --- Service Endpoints ---
    EMBEDDING_SERVICE_URL = get_env(
        "EMBEDDING_SERVICE_URL", "http://embedding-service:8000"
    )
    CHAT_SERVICE_URL = get_env("CHAT_SERVICE_URL", "http://chat-service:8000")

    # --- API Keys and Base URLs ---
    OPENAI_API_KEY = get_env("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY = get_env("ANTHROPIC_API_KEY", "")
    GOOGLE_API_KEY = get_env("GOOGLE_API_KEY", "")
    OLLAMA_BASE_URL = get_env("OLLAMA_BASE_URL", "http://localhost:11434")

    # --- LLM / Model ---
    # Get provider from env, default to 'google' (Gemini)
    DEFAULT_PROVIDER = get_env("DEFAULT_PROVIDER", "google")

    # Get provider-specific config
    _default_provider_config = PROVIDER_CONFIGS.get(
        DEFAULT_PROVIDER.lower(), PROVIDER_CONFIGS["google"]
    )

    # Get model from env, default to provider's default model
    DEFAULT_MODEL = get_env("DEFAULT_MODEL", _default_provider_config.default_model)

    # Get model-specific config
    _default_model_config = _default_provider_config.get_model_config(DEFAULT_MODEL)

    # Allow environment variables to override model defaults
    DEFAULT_TEMPERATURE = get_env(
        "DEFAULT_TEMPERATURE", _default_model_config.temperature, float
    )
    DEFAULT_MAX_TOKENS = get_env(
        "DEFAULT_MAX_TOKENS", _default_model_config.max_tokens, int
    )

    @classmethod
    def get_provider_config(cls, provider: str = None) -> ProviderConfig:
        """
        Get configuration for a specific provider.

        Args:
            provider: Provider name (openai, anthropic, google, ollama)
                     If None, returns config for current provider

        Returns:
            ProviderConfig object for the specified provider
        """
        if provider is None:
            provider = cls.DEFAULT_PROVIDER
        return PROVIDER_CONFIGS.get(provider.lower(), PROVIDER_CONFIGS["google"])

    @classmethod
    def get_model_config(cls, provider: str = None, model: str = None) -> ModelConfig:
        """
        Get configuration for a specific model.

        Args:
            provider: Provider name. If None, uses current provider
            model: Model name. If None, uses provider's default model

        Returns:
            ModelConfig object for the specified model
        """
        provider_config = cls.get_provider_config(provider)
        return provider_config.get_model_config(model)

    @classmethod
    def get_all_providers(cls) -> Dict[str, ProviderConfig]:
        """Get all available provider configurations"""
        return PROVIDER_CONFIGS.copy()

    @classmethod
    def get_all_provider_models(cls, provider: str = None) -> List[str]:
        """
        Get all available models for a specific provider.

        Args:
            provider: Provider name. If None, uses current provider

        Returns:
            List of model names
        """
        provider_config = cls.get_provider_config(provider)
        return provider_config.get_all_models()

    # --- Retrieval / RAG ---
    TOP_K = get_env("TOP_K", 5, int)
    RAG_SEARCH_LIMIT = get_env("RAG_SEARCH_LIMIT", 10, int)
    RERANK_TOP_N = get_env("RERANK_TOP_N", 5, int)


class DevelopmentSettings(BaseSettings):
    """Development environment settings"""

    DEBUG = True
    LOG_LEVEL = "DEBUG"
    TIMEOUT = 60


class StagingSettings(BaseSettings):
    """Staging environment settings"""

    DEBUG = False
    LOG_LEVEL = "INFO"
    TIMEOUT = 45


class ProductionSettings(BaseSettings):
    """Production environment settings"""

    DEBUG = False
    LOG_LEVEL = "WARNING"
    TIMEOUT = 30


def get_settings() -> BaseSettings:
    """
    Factory function to get the appropriate settings based on ENVIRONMENT variable.

    Returns:
        Settings instance for the current environment (development, staging, or production)
    """
    env = get_environment()

    settings_map = {
        "development": DevelopmentSettings,
        "staging": StagingSettings,
        "production": ProductionSettings,
    }

    settings_class = settings_map.get(env, DevelopmentSettings)
    return settings_class()


# Backward compatibility: Keep Settings as alias to BaseSettings
Settings = BaseSettings
