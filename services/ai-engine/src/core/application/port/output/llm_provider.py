from abc import ABC, abstractmethod
from typing import List, Optional
from src.core.domain.model.llm import Model
from src.core.domain.value_object.llm import Message, ModelConfig


class LLMProviderPort(ABC):
    @abstractmethod
    async def generate_completion(
        self,
        model: Model,
        messages: List[Message],
        config_override: Optional[ModelConfig] = None,
    ) -> str:
        """
        Generate a completion from the LLM based on the provided messages and history.

        Args:
            model: The model entity containing configuration.
            messages: A list of Message value objects.
            config_override: Optional configuration to override the model's default config.

        Returns:
            The generated text content.
        """
        pass
