from typing import Optional

from src.config.settings import settings
import litellm
from litellm.integrations.custom_logger import CustomLogger
from loguru import logger


class TokenStreamingHandler(CustomLogger):
    """
    LiteLLM CustomLogger that intercepts stream chunks and pushes them to a sync callback.
    """

    def __init__(self, token_callback):
        self.token_callback = token_callback
        super().__init__()

    async def async_log_stream_event(self, kwargs, response_obj, start_time, end_time):
        self._process_chunk(kwargs)

    def log_stream_event(self, kwargs, response_obj, start_time, end_time):
        self._process_chunk(kwargs)

    def _process_chunk(self, kwargs):
        if self.token_callback and "chunk" in kwargs:
            chunk = kwargs["chunk"]
            try:
                # Most chunks have text in choices[0].delta.content
                if hasattr(chunk, "choices") and chunk.choices:
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        self.token_callback(delta.content)
            except Exception:
                pass

    def cleanup(self):
        if hasattr(litellm, "success_callback") and self in litellm.success_callback:
            litellm.success_callback.remove(self)


class AgentStepCallback:
    """
    Callable class for CrewAI agent step callbacks that formats status messages.

    In CrewAI, the step_callback is primarily called when the agent
    produces a final answer (AgentFinish), NOT when tools are invoked.
    Tool invocation status is handled directly by the MCPTool instances
    via their own status_callback.
    """

    def __init__(self, report_func):
        self._report_func = report_func

    def __call__(self, step):
        agent_name = "AI Agent"
        try:
            # Handle string messages (manual reports from Flow)
            if isinstance(step, str):
                self._report_func(step)
                return

            # Unwrap lists/tuples
            if isinstance(step, (list, tuple)) and len(step) > 0:
                step = step[0]

            agent_name = self._extract_agent_name(step) or agent_name
            output_text = self._extract_output_text(step)
            message = self._format_message(output_text)

            self._report_func(message)

        except Exception as e:
            if settings.debug:
                logger.error(f"Error in AgentStepCallback: {str(e)}")
            self._report_func(f"{agent_name} is working...")

    @staticmethod
    def _extract_agent_name(step) -> Optional[str]:
        """Try to extract the agent name from a step object."""
        for attr in ["agent", "role", "agent_name"]:
            val = getattr(step, attr, None)
            if val:
                if hasattr(val, "role"):
                    return val.role
                elif hasattr(val, "name"):
                    return val.name
                else:
                    return str(val)
        return None

    @staticmethod
    def _extract_output_text(step) -> Optional[str]:
        """Try to extract meaningful output text from a step object."""
        for attr in ["text", "thought", "output", "return_values"]:
            val = getattr(step, attr, None)
            if val:
                if isinstance(val, dict):
                    return str(val.get("output", ""))
                elif isinstance(val, str):
                    return val.strip()
        return None

    @staticmethod
    def _format_message(output_text: Optional[str]) -> str:
        """Format output text into a user-facing status message."""
        if not output_text:
            return "Thinking..."

        clean = output_text.strip()
        if clean.startswith("{") and (
            '"response"' in clean or "'response'" in clean
        ):
            return "Formulating final answer..."

        # Truncate long thoughts
        thought = clean.replace("\n", " ").strip()
        if len(thought) > 80:
            thought = thought[:77] + "..."
        return thought
