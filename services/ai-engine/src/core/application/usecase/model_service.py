from typing import List, Optional
from src.core.application.port.output.repository import ModelRepository
from src.core.domain.model.llm import Model


class ModelService:
    """
    Service for managing LLM models.
    Models are read-only and loaded from configuration.
    """

    def __init__(self, model_repository: ModelRepository):
        self.model_repository = model_repository

    async def list_models(self, provider: Optional[str] = None) -> List[Model]:
        """
        List all available models, optionally filtered by provider.

        Args:
            provider: Optional provider filter (e.g., 'openai', 'google', 'anthropic')

        Returns:
            List of Model entities
        """
        return await self.model_repository.list(provider=provider)

    async def get_model(self, model_id: str) -> Model:
        """
        Get a specific model by ID.

        Args:
            model_id: Model identifier

        Returns:
            Model entity

        Raises:
            ValueError: If model not found
        """
        model = await self.model_repository.get(model_id)
        if not model:
            raise ValueError(f"Model not found: {model_id}")
        return model
