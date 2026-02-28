import json
from typing import Callable, List, Optional


class FlowStatusReporter:
    """
    Encapsulates all SSE status-update logic for SearchCrewFlow.
    Accepts an optional callback and exposes named report methods
    so flow.py stays focused on orchestration.
    """

    def __init__(self, callback: Optional[Callable[[str], None]] = None):
        self._callback = callback

    def report(self, message: str):
        """Emit a raw status message."""
        if self._callback:
            self._callback(message)

    def report_tools(self, tools: list):
        """Emit loaded tool names."""
        names = ", ".join(t.name.replace("_", " ") for t in tools)
        self.report(f"Loaded {len(tools)} tools: {names}")

    def report_context(self, context: str):
        """Emit attachment status from an enriched context string."""
        if context:
            lines = [l for l in context.splitlines() if l.strip()]
            self.report(
                f"Processing attached documents ({len(lines)} lines of context)..."
            )
        else:
            self.report("No attachments detected.")

    def report_history(self, history: List):
        """Emit chat history status with a preview of the last message."""
        if not history:
            return
        count = len(history)
        last_msg = history[-1]
        preview = ""
        if isinstance(last_msg, dict):
            content = last_msg.get("content", "") or last_msg.get("message", "")
            if content:
                snippet = content if len(content) <= 40 else content[:37] + "..."
                preview = f' — last: "{snippet}"'
        self.report(
            f"Loading {count} previous message{'s' if count > 1 else ''}{preview}"
        )

    def report_task_completion(self, output):
        """Parse crew task output and emit a meaningful completion status."""
        try:
            self.report("Analysis complete — preparing response...")
        except Exception:
            pass
