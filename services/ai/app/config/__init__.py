"""
Configuration package for AI Service
"""

from .settings import (
    get_config,
    BaseConfig,
    DevelopmentConfig,
    ProductionConfig,
    TestingConfig,
    get_model_config,
    get_provider_config,
    is_model_supported,
    get_supported_models,
    get_supported_providers,
)

# Create a default config instance
settings = get_config()

__all__ = [
    "get_config",
    "BaseConfig",
    "DevelopmentConfig",
    "ProductionConfig",
    "TestingConfig",
    "settings",
    "get_model_config",
    "get_provider_config",
    "is_model_supported",
    "get_supported_models",
    "get_supported_providers",
]
