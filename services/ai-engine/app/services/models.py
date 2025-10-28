from crewai import LLM
from typing import Dict, Optional, Any
from fastapi import HTTPException
import json
from pathlib import Path
from app.config.settings import settings
from app.schemas.base import BaseResponse


class ModelService:

    def __init__(self):
        self._models: Dict[str, Any] = self._load_models()

    # ============================================================================
    # Helper Methods
    # ============================================================================

    def _load_models(self) -> Dict[str, Any]:
        """Load models configuration from JSON file."""
        config_path = Path(__file__).parent.parent / "config" / "models.json"
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f) or {}

    # ============================================================================
    # Model Config Operations
    # ============================================================================

    def get_models_config(self) -> BaseResponse:
        try:
            return BaseResponse(
                success=True,
                message="Models fetched successfully",
                data={"configs": self._models, "count": len(self._models)},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def get_model_config(self, model: str) -> BaseResponse:
        try:
            if not model in self._models.keys():
                raise HTTPException(
                    status_code=404, detail=f"Model '{model}' not found"
                )
            return BaseResponse(
                success=True,
                message="Model fetched successfully",
                data={"config": self._models.get(model)},
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    # ============================================================================
    # Get Model Instance
    # ============================================================================
    def get_model(self, model: str) -> Optional[LLM]:
        model_info = self._models.get(model)
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
