"""
Configuration module for AI Engine Service.

Settings เป็นที่กำหนดค่าทั้งหมดเลย ใช้ get_env และมี list providers
Class และ function แยกออกไปใน models.py
"""

import yaml
from pathlib import Path
from typing import Dict, Any
from app.models.agents import AgentConfig

from .settings import settings
from .tools import TOOLS


def load_crews() -> Dict[str, Any]:
    """Load crews configuration from YAML file."""
    config_path = Path(__file__).parent / "crews.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_models() -> Dict[str, Any]:
    """Load models configuration from YAML file."""
    config_path = Path(__file__).parent / "models.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_agents() -> Dict[str, AgentConfig]:
    """Load agents configuration from YAML file and convert to AgentConfig objects."""
    config_path = Path(__file__).parent / "agents.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        agents_data = yaml.safe_load(f) or {}

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
