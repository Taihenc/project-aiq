"""
Configuration module for AI Engine Service.

This module provides environment-aware settings that automatically
adapt based on the ENVIRONMENT variable (development, staging, production).

Usage:
    from app.config import settings

    # Variables
    settings.DEBUG              # True in development, False in production
    settings.DEFAULT_PROVIDER   # e.g., 'google'
    settings.DEFAULT_MODEL      # e.g., 'gemini-2.0-flash-exp'
    settings.DEFAULT_TEMPERATURE        # e.g., 0.7
    settings.DEFAULT_MAX_TOKENS         # e.g., 8192
    settings.OPENAI_API_KEY     # API keys
    settings.TOP_K              # Retrieval setting, e.g., 5

    # Methods for model and provider configuration
    settings.get_provider_config('google')            # Get specific provider config
    settings.get_model_config('google', 'gemini-2.0-flash-exp')  # Get specific model config
    settings.get_all_providers()                      # Get all provider configs dict
    settings.get_all_provider_models('openai')        # Get models for specific provider
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
