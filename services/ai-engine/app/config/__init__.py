"""
Configuration module for AI Engine Service.
"""

import json
from pathlib import Path
from typing import Dict, Any
from app.models import AgentConfig, CrewConfig

from .settings import settings
from .tools import TOOLS


def load_crews() -> Dict[str, CrewConfig]:
    """Load crews configuration from JSON file."""
    config_path = Path(__file__).parent / "crews.json"
    with open(config_path, "r", encoding="utf-8") as f:
        crews_data = json.load(f) or {}

    crews = {}
    for name, config_data in crews_data.items():
        crews[name] = CrewConfig(**config_data)

    return crews


def load_models() -> Dict[str, Any]:
    """Load models configuration from JSON file."""
    config_path = Path(__file__).parent / "models.json"
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f) or {}


def load_agents() -> Dict[str, Any]:
    """Load agents configuration from JSON file and convert to AgentConfig objects."""
    config_path = Path(__file__).parent / "agents.json"
    with open(config_path, "r", encoding="utf-8") as f:
        agents_data = json.load(f) or {}

    # Convert to AgentConfig objects
    agents = {}
    for name, config_data in agents_data.items():
        agents[name] = AgentConfig(**config_data)

    return agents


settings.MODELS = load_models()
settings.AGENTS = load_agents()
settings.CREWS = load_crews()
settings.TOOLS = TOOLS


__all__ = [
    "settings",
]
