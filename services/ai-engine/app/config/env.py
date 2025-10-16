"""
Environment variable helpers.

Use these functions to access env vars outside of Settings.
If you frequently use a specific env var, consider adding it to Settings instead.
"""

import os
from dotenv import load_dotenv

load_dotenv()


def get_env(name: str, default=None, cast=None):
    """Get environment variable with optional type casting"""
    value = os.getenv(name, default)
    if cast and value not in (None, ""):
        try:
            return cast(value)
        except Exception:
            raise ValueError(f"Cannot cast env var {name}={value} to {cast}")
    return value


def get_bool_env(name: str, default=False):
    """Get boolean environment variable"""
    val = os.getenv(name)
    if val is None:
        return default
    return val.lower() in ["1", "true", "yes", "y", "on"]


def get_environment():
    """Get current environment mode (development, staging, or production)"""
    return os.getenv("ENVIRONMENT", "development").lower()
