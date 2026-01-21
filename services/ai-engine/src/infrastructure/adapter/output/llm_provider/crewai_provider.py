from typing import List, Dict, Any, Optional
from crewai import LLM
from src.core.application.port.output.llm_provider import LLMProviderPort
from src.core.domain.model.llm import Model
from src.core.domain.value_object.llm import Message, ModelConfig
from src.core.domain.exceptions import LLMProviderError


class CrewAILLMProvider(LLMProviderPort):
    async def generate_completion(
        self,
        model: Model,
        messages: List[Message],
        config_override: Optional[ModelConfig] = None,
    ) -> str:
        # Base config from model defaults
        config = model.default_config.model_dump() if model.default_config else {}

        # Apply overrides if present
        if config_override:
            # Filter out None values from override to avoid clearing valid defaults
            valid_overrides = config_override.model_dump(
                exclude_unset=True, exclude_none=True
            )
            config.update(valid_overrides)

        # Map to CrewAI LLM params
        # Note: CrewAI LLM might expect specific param names.
        # Referencing user request: "config_override" provided in request matches ModelConfig fields.

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
            # Initialize CrewAI LLM
            # We pass **llm_params which includes 'model' key.
            my_llm = LLM(**llm_params)

            # Convert messages to list of dicts for CrewAI
            messages_dicts = [msg.model_dump() for msg in messages]
            response = my_llm.call(messages=messages_dicts)
            return response

        except Exception as e:
            # Wrap or re-raise
            # Basic error mapping
            error_msg = str(e)
            if "Connection error" in error_msg:
                raise LLMProviderError(
                    f"Failed to connect to LLM provider: {error_msg}"
                )
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
