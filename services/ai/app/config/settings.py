"""
Configuration settings for different environments
"""

import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class BaseConfig:
    """Base configuration class"""

    # Application
    APP_NAME = "AI Service"
    APP_VERSION = "1.0.0"
    DEBUG = False
    TESTING = False

    # API
    API_HOST = "0.0.0.0"
    API_PORT = 8000

    # AI Models
    DEFAULT_PROVIDER = "openai"
    DEFAULT_MODEL = "gpt-3.5-turbo"

    # Model Parameters
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_TOP_K = 50
    DEFAULT_TOP_P = 0.9
    DEFAULT_MAX_TOKENS = 1000
    DEFAULT_FREQUENCY_PENALTY = 0.0
    DEFAULT_PRESENCE_PENALTY = 0.0

    # Additional Settings
    DEFAULT_STREAM = True
    DEFAULT_STOP_SEQUENCES = None
    DEFAULT_SEED = None

    # Rate Limiting
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_WINDOW = 3600

    # Logging
    LOG_LEVEL = "INFO"

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

    # Chat
    MAX_CHAT_HISTORY = 50
    CHAT_SESSION_TIMEOUT = 3600


class DevelopmentConfig(BaseConfig):
    """Development configuration"""

    DEBUG = True
    LOG_LEVEL = "DEBUG"


class ProductionConfig(BaseConfig):
    """Production configuration"""

    DEBUG = False
    LOG_LEVEL = "WARNING"


class TestingConfig(BaseConfig):
    """Testing configuration"""

    DEBUG = True
    TESTING = True


# Configuration mapping
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config(env: str = None) -> BaseConfig:
    """Get configuration for environment"""
    if env is None:
        env = os.getenv("ENVIRONMENT")

    return config.get(env, DevelopmentConfig)()


# Model configurations
MODEL_CONFIGS = {
    "gpt-3.5-turbo": {
        "provider": "openai",
        "max_tokens": 4096,
        "temperature_range": (0.0, 2.0),
        "supports_streaming": True,
    },
    "gpt-4": {
        "provider": "openai",
        "max_tokens": 8192,
        "temperature_range": (0.0, 2.0),
        "supports_streaming": True,
    },
    "gpt-4-turbo": {
        "provider": "openai",
        "max_tokens": 128000,
        "temperature_range": (0.0, 2.0),
        "supports_streaming": True,
    },
    "claude-3-sonnet": {
        "provider": "anthropic",
        "max_tokens": 4096,
        "temperature_range": (0.0, 1.0),
        "supports_streaming": True,
    },
    "claude-3-opus": {
        "provider": "anthropic",
        "max_tokens": 4096,
        "temperature_range": (0.0, 1.0),
        "supports_streaming": True,
    },
    "gemini-pro": {
        "provider": "google",
        "max_tokens": 32768,
        "temperature_range": (0.0, 2.0),
        "supports_streaming": True,
    },
}


# Provider configurations
PROVIDER_CONFIGS = {
    "openai": {
        "api_key_env": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1",
        "models_endpoint": "/models",
    },
    "anthropic": {
        "api_key_env": "ANTHROPIC_API_KEY",
        "base_url": "https://api.anthropic.com",
        "models_endpoint": "/v1/models",
    },
    "google": {
        "api_key_env": "GOOGLE_AI_API_KEY",
        "base_url": "https://generativelanguage.googleapis.com",
        "models_endpoint": "/v1beta/models",
    },
}


def get_model_config(model_name: str) -> dict:
    """Get configuration for a specific model"""
    return MODEL_CONFIGS.get(model_name, {})


def get_provider_config(provider: str) -> dict:
    """Get configuration for a specific provider"""
    return PROVIDER_CONFIGS.get(provider, {})


def is_model_supported(model_name: str) -> bool:
    """Check if a model is supported"""
    return model_name in MODEL_CONFIGS


def get_supported_models() -> List[str]:
    """Get list of supported models"""
    return list(MODEL_CONFIGS.keys())


def get_supported_providers() -> List[str]:
    """Get list of supported providers"""
    return list(PROVIDER_CONFIGS.keys())
