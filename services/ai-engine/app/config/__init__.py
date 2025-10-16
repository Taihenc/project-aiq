"""
Configuration module for AI Engine Service.

This module provides environment-aware settings that automatically
adapt based on the ENVIRONMENT variable (development, staging, production).

Usage:
    from app.config import settings

    print(settings.DEBUG)       # True in development, False in production
    print(settings.LOG_LEVEL)   # 'DEBUG' in development, 'WARNING' in production
    print(settings.MODEL)       # Loaded from environment variables
"""

from .settings import (
    get_settings,
    BaseSettings,
    DevelopmentSettings,
    StagingSettings,
    ProductionSettings,
    ProviderConfig,
    PROVIDER_CONFIGS,
    ModelConfig,
)

# Initialize settings based on current environment
settings = get_settings()

__all__ = [
    "settings",
    "BaseSettings",
    "DevelopmentSettings",
    "StagingSettings",
    "ProductionSettings",
    "ProviderConfig",
    "PROVIDER_CONFIGS",
    "ModelConfig",
]
