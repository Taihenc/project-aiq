import json
from src.config.settings import settings


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
                    print(f"DEBUG: Status Update -> {step}")
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
                print(f"DEBUG: Agent Step -> {message}")

            report_func(message)

        except Exception as e:
            if settings.debug:
                print(f"DEBUG: Error in agent_step_callback: {str(e)}")
            report_func(f"{agent_name} is working...")

    return agent_step_callback
