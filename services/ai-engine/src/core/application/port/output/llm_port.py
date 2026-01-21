from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncIterator
from src.core.domain.model.model_config import ModelConfig


class LLMProvider(ABC):
    """
    Output port for LLM providers.
    Defines the interface for interacting with language model APIs (OpenAI, Google, etc.).
    """

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        config: Optional[ModelConfig] = None,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """
        Send messages to LLM and get completion response.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            model: Model ID to use (e.g., 'gpt-4-turbo', 'gemini-pro')
            config: Optional model configuration (temperature, max_tokens, etc.)
            stream: Whether to stream the response

        Returns:
            Dict containing:
                - content: Response text
                - role: 'assistant'
                - usage: Dict with token counts (prompt_tokens, completion_tokens, total_tokens)
        """
        pass

    @abstractmethod
    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        config: Optional[ModelConfig] = None,
    ) -> AsyncIterator[str]:
        """
        Stream chat completion response chunk by chunk.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            model: Model ID to use
            config: Optional model configuration

        Yields:
            Response text chunks as they arrive
        """
        pass

    @abstractmethod
    async def get_available_models(self) -> List[Dict[str, Any]]:
        """
        Get list of available models from this provider.

        Returns:
            List of dicts containing model metadata (id, name, etc.)
        """
        pass
