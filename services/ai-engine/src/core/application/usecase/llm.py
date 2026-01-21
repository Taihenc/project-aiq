from typing import List, Optional
from datetime import datetime
from src.core.application.port.output.repository import ModelRepository
from src.core.application.port.output.llm_provider import LLMProviderPort
from src.core.application.port.input.llm_port import ModelPort
from src.core.domain.model.llm import Model
from src.core.application.dto.llm import (
    CreateModelRequest,
    UpdateModelRequest,
    CompletionRequest,
    CompletionResponse,
)
from src.core.domain.value_object.llm import ModelConfig
from src.core.domain.exceptions import (
    EntityNotFoundException,
    DuplicateEntityException,
    InactiveEntityException,
)


class ModelService(ModelPort):
    """
    Service for managing LLM models.
    """

    def __init__(
        self, model_repository: ModelRepository, llm_provider: LLMProviderPort
    ):
        self.model_repository = model_repository
        self.llm_provider = llm_provider

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
            EntityNotFoundException: If model not found
        """
        model = await self.model_repository.get(model_id)
        if not model:
            raise EntityNotFoundException(f"Model not found: {model_id}")
        return model

    async def create_model(self, request: CreateModelRequest) -> Model:
        """
        Create a new model configuration.
        """
        # Check for duplicates
        existing_models = await self.model_repository.list(provider=request.provider)
        for m in existing_models:
            if m.name == request.name:
                raise DuplicateEntityException(
                    f"Model '{request.name}' already exists for provider '{request.provider}'"
                )

        model = Model(**request.model_dump())
        return await self.model_repository.create(model)

    async def update_model(self, model_id: str, request: UpdateModelRequest) -> Model:
        """
        Update an existing model configuration.
        """
        existing = await self.model_repository.get(model_id)
        if not existing:
            raise EntityNotFoundException(f"Model not found: {model_id}")

        # Check for duplicates if identifying fields are changing
        if request.name is not None or request.provider is not None:
            target_name = request.name if request.name is not None else existing.name
            target_provider = (
                request.provider if request.provider is not None else existing.provider
            )

            existing_models = await self.model_repository.list(provider=target_provider)
            for m in existing_models:
                if m.name == target_name and m.id != existing.id:
                    raise DuplicateEntityException(
                        f"Model '{target_name}' already exists for provider '{target_provider}'"
                    )

        # Update fields
        update_data = request.model_dump(exclude_unset=True)

        # Manual merge for default_config if present
        if "default_config" in update_data and update_data["default_config"]:
            existing_config = existing.default_config.model_dump()
            new_config_values = update_data["default_config"]
            merged_config = {**existing_config, **new_config_values}
            update_data["default_config"] = ModelConfig(**merged_config)

        updated_model = existing.model_copy(update=update_data)
        updated_model.updated_at = datetime.utcnow()

        return await self.model_repository.update(updated_model)

    async def delete_model(self, model_id: str) -> bool:
        """
        Delete a model configuration.
        """
        existing = await self.model_repository.get(model_id)
        if not existing:
            raise EntityNotFoundException(f"Model not found: {model_id}")
        return await self.model_repository.delete(model_id)

    async def completion(
        self, model_id: str, request: CompletionRequest
    ) -> CompletionResponse:
        """
        Generate a completion for the given model and messages.
        """
        model = await self.get_model(model_id)

        if not model.is_active:
            raise InactiveEntityException(f"Model is not active: {model_id}")

        # Prepare config override if any values are set
        config_override = request.config if request.config else None

        content = await self.llm_provider.generate_completion(
            model=model, messages=request.messages, config_override=config_override
        )

        return CompletionResponse(content=content)
