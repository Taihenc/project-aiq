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

        return LLM(**model_info)
