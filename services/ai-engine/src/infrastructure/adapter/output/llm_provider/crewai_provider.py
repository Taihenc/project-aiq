from typing import List, Optional
from crewai import LLM
from src.core.application.port.output.llm_provider import LLMProviderPort
from src.core.domain.model.llm import Model
from src.core.domain.value_object.llm import Message, ModelConfig
from src.core.domain.exceptions import LLMProviderError


class CrewAILLMProvider(LLMProviderPort):
    def get_llm(
        self, model: Model, config_override: Optional[ModelConfig] = None
    ) -> LLM:
        """
        Create a CrewAI LLM instance from a domain Model.
        """
        # Base config from model defaults
        config = model.default_config.model_dump() if model.default_config else {}

        # Apply overrides if present
        if config_override:
            valid_overrides = config_override.model_dump(
                exclude_unset=True, exclude_none=True
            )
            config.update(valid_overrides)

        llm_params = {
            "model": f"{model.provider}/{model.name}",
            "temperature": config.get("temperature"),
            "max_tokens": config.get("max_tokens"),
            "top_p": config.get("top_p"),
            "frequency_penalty": config.get("frequency_penalty"),
            "presence_penalty": config.get("presence_penalty"),
        }

        # Clean up None values
        llm_params = {k: v for k, v in llm_params.items() if v is not None}

        try:
            return LLM(**llm_params)
        except Exception as e:
            self._handle_llm_error(e)

    async def generate_completion(
        self,
        model: Model,
        messages: List[Message],
        config_override: Optional[ModelConfig] = None,
    ) -> str:
        """
        Generate a completion using CrewAI's LLM (LiteLLM wrapper).
        """
        llm = self.get_llm(model, config_override)
        formatted_messages = [{"role": m.role, "content": m.content} for m in messages]

        try:
            return await llm.call(formatted_messages)
        except Exception as e:
            self._handle_llm_error(e)

    def _handle_llm_error(self, e: Exception) -> None:
        """
        Centralized error handling for LLM operations.
        """
        if isinstance(e, LLMProviderError):
            raise e

        error_msg = str(e)
        if "Connection error" in error_msg:
            raise LLMProviderError(f"Failed to connect to LLM provider: {error_msg}")
        elif "AuthenticationError" in error_msg or "401" in error_msg:
            raise LLMProviderError(
                f"Authentication failed with LLM provider: {error_msg}"
            )
        elif "RateLimitError" in error_msg or "429" in error_msg:
            raise LLMProviderError(
                f"Rate limit exceeded with LLM provider: {error_msg}"
            )
        elif "DeploymentNotFound" in error_msg or "404" in error_msg:
            raise LLMProviderError(f"Model deployment not found: {error_msg}")

        raise LLMProviderError(f"LLM Provider error: {error_msg}") from e
