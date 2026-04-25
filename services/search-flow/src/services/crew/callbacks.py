import json
from loguru import logger
from src.config.settings import settings
import litellm
from litellm.integrations.custom_logger import CustomLogger


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


def create_agent_step_callback(report_func):
    """
    Creates a callback for CrewAI agent steps that formats status messages.

    NOTE: In CrewAI, the step_callback is primarily called when the agent
    produces a final answer (AgentFinish), NOT when tools are invoked.
    Tool invocation status is handled directly by the MCPTool instances
    via their own status_callback.
    """

    def agent_step_callback(step):
        agent_name = "AI Agent"
        try:
            # Handle string messages (manual reports from Flow)
            if isinstance(step, str):
                if settings.debug:
                    logger.debug(f"Status Update -> {step}")
                report_func(step)
                return

            message = "Thinking..."

            # Unwrap lists/tuples
            if isinstance(step, (list, tuple)) and len(step) > 0:
                step = step[0]

            # Try to extract agent name
            for attr in ["agent", "role", "agent_name"]:
                val = getattr(step, attr, None)
                if val:
                    if hasattr(val, "role"):
                        agent_name = val.role
                    elif hasattr(val, "name"):
                        agent_name = val.name
                    else:
                        agent_name = str(val)
                    break

            # Check if this is the final answer output
            # CrewAI step_callback receives AgentFinish with return_values or output
            output_text = None
            for attr in ["text", "thought", "output", "return_values"]:
                val = getattr(step, attr, None)
                if val:
                    if isinstance(val, dict):
                        output_text = str(val.get("output", ""))
                    elif isinstance(val, str):
                        output_text = val.strip()
                    break

            if output_text:
                # Check if the output is the final JSON response
                clean = output_text.strip()
                if clean.startswith("{") and (
                    '"response"' in clean or "'response'" in clean
                ):
                    message = "Formulating final answer..."
                else:
                    # Truncate long thoughts
                    thought = output_text.replace("\n", " ").strip()
                    if len(thought) > 80:
                        thought = thought[:77] + "..."
                    message = f"{thought}"
            else:
                message = "Thinking..."

            if settings.debug:
                logger.debug(f"Agent Step -> {message}")

            report_func(message)

        except Exception as e:
            if settings.debug:
                logger.debug(f"Error in agent_step_callback: {str(e)}")
            report_func(f"{agent_name} is working...")

    return agent_step_callback
