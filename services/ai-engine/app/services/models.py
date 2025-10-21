from crewai import LLM
from typing import Dict, Optional, Any
from app.config import settings


class ModelService:

    # ============================================================================
    # Model Config Operations
    # ============================================================================

    def get_models_config(self) -> Dict[str, Any]:
        return settings.MODELS

    def get_model_config(self, model_key: str) -> Optional[Dict[str, Any]]:
        if not self._check_model_exists(model_key):
            return None
        return settings.MODELS.get(model_key)

    def _check_model_exists(self, model_key: str) -> bool:
        return model_key in settings.MODELS.keys()

    # ============================================================================
    # Model Runtime Operations
    # ============================================================================
    def get_model(self, model_key: str) -> Optional[LLM]:
        model_info = settings.MODELS.get(model_key)
        if not model_info:
            return None

        # Create a copy of model_info to avoid modifying the original
        model_config = model_info.copy()

        # Add provider prefix if not already present
        if "provider" in model_config and model_config["provider"]:
            provider = model_config["provider"]
            model_name = model_config["model"]
            if not model_name.startswith(f"{provider}/"):
                model_config["model"] = f"{provider}/{model_name}"
            # Remove provider key as it's not needed for LLM
            del model_config["provider"]

        # Add Azure configuration if available
        if settings.AZURE_API_KEY:
            model_config["api_key"] = settings.AZURE_API_KEY
        if settings.AZURE_API_BASE:
            model_config["base_url"] = settings.AZURE_API_BASE
        if settings.AZURE_API_VERSION:
            model_config["api_version"] = settings.AZURE_API_VERSION

        return LLM(**model_config)
