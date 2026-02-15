import requests
import json
import sys
from typing import List, Dict, Any
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table
from rich import print as rprint

# Configuration
API_URL = "http://localhost:8000/api/v1/completions"  # Port 8000 from settings.py
HEADERS = {"Content-Type": "application/json"}

console = Console()


class SearchClient:
    def __init__(self):
        self.history: List[str] = []
        self.context: List[Dict[str, Any]] = []  # List of Citation objects
        self.session = requests.Session()

    def display_context(self):
        """Displays the current active context."""
        if not self.context:
            console.print("[dim]No active context loaded.[/dim]")
            return

        table = Table(
            title="Active Context (Attached to next request)",
            show_header=True,
            header_style="bold magenta",
            show_lines=True,
        )
        table.add_column("Index", style="dim", width=6)
        table.add_column("Source", style="cyan", width=12)
        table.add_column("Content", style="green")
        table.add_column("Metadata", style="yellow")

        for idx, item in enumerate(self.context):
            source = item.get("source", "unknown")
            data = item.get("data", {})  # Citation uses 'data'

            # Content
            content_text = data.get("content", "")

            # Metadata (Everything else)
            metadata_lines = []
            for k, v in data.items():
                if k not in ["content", "type"]:
                    metadata_lines.append(f"{k}: {v}")
            metadata_text = "\n".join(metadata_lines)

            table.add_row(
                str(idx),
                source,
                content_text[:100] + "..." if len(content_text) > 100 else content_text,
                metadata_text,
            )

        console.print(table)

    def select_context(self, new_citations: List[Dict[str, Any]]):
        """Interactively allows user to select context to keep."""
        if not new_citations and not self.context:
            return

        console.print("\n[bold yellow]󰋚 Context Management[/bold yellow]")

        # Combine existing and new for selection
        all_candidates = self.context + new_citations

        # Display candidates
        table = Table(show_header=True, header_style="bold blue", show_lines=True)
        table.add_column("ID", style="bold white", width=4)
        table.add_column("Origin", style="bold cyan", width=8)
        table.add_column("Type", style="bold magenta", width=12)
        table.add_column("Content", style="italic green")
        table.add_column("Metadata", style="yellow")

        for idx, item in enumerate(all_candidates):
            origin = "OLD" if idx < len(self.context) else "NEW"
            data = item.get("data", {})
            ctype = data.get("type", "unknown")

            # Content
            content_text = data.get("content", "")

            # Metadata (Everything else)
            metadata_lines = []
            for k, v in data.items():
                if k not in ["content", "type"]:
                    metadata_lines.append(f"{k}: {v}")
            metadata_text = "\n".join(metadata_lines)

            table.add_row(
                str(idx),
                origin,
                ctype.upper(),
                content_text[:100] + "..." if len(content_text) > 100 else content_text,
                metadata_text,
            )

        console.print(table)

        # Selection Loop
        rprint("[bold white]Select items to KEEP for the next turn.[/bold white]")
        rprint("[dim]Enter IDs (0,2), 'all', 'none', or 'keep_old'[/dim]")

        choice = Prompt.ask("Selection", default="all")

        if choice.lower() == "all":
            self.context = all_candidates
        elif choice.lower() == "none":
            self.context = []
        elif choice.lower() == "keep_old":
            pass
        else:
            try:
                indices = [
                    int(x.strip()) for x in choice.split(",") if x.strip().isdigit()
                ]
                self.context = [
                    all_candidates[i] for i in indices if 0 <= i < len(all_candidates)
                ]
            except Exception as e:
                console.print(f"[red]Error: {e}. Keeping old context.[/red]")

        rprint(
            f"[bold green]✓ Context updated. {len(self.context)} items active.[/bold green]\n"
        )

    def chat_loop(self):
        # Color mapping for actions
        ACTION_COLORS = {
            "chat": "green",
            "search": "yellow",
            "reject": "red",
            "lookup": "blue",
            "ask": "blue",
            "no_skill": "magenta",
            "unknown": "white",
        }

        console.print(
            Panel.fit(
                "[bold cyan]AINGO SEARCH FLOW[/bold cyan]\n[dim]AI-Powered Intelligence Intelligence Engine[/dim]",
                subtitle="Type 'exit' to quit",
                border_style="cyan",
                padding=(1, 2),
            )
        )

        while True:
            # 1. Input Phase
            self.display_context()
            query = Prompt.ask("\n[bold cyan]YOU[/bold cyan]")

            if query.lower() in ("exit", "quit"):
                break

            if not query.strip():
                continue

            # 2. Sending Request
            # Extract 'data' from Citation objects for the payload
            context_payload = [c.get("data") for c in self.context if c.get("data")]
            payload = {
                "query": query,
                "history": self.history,
                "context": context_payload,
            }

            try:
                with console.status(
                    "[bold cyan]Processing...[/bold cyan]", spinner="bouncingBar"
                ):
                    response = self.session.post(API_URL, json=payload, timeout=60)
                    response.raise_for_status()
                    api_response = response.json()
                    data = api_response.get("data", {})

                # 3. Output Phase
                # data structure: FlowResponse(action, response, details)
                action = data.get("action", "unknown")
                responseText = data.get("response", "")
                details = data.get("details", [])

                color = ACTION_COLORS.get(action, "white")

                # Wrapped response in a Panel
                console.print(
                    Panel(
                        Markdown(responseText),
                        title=f"[bold {color}]AGENT ACTION: {action.upper()}[/bold {color}]",
                        title_align="left",
                        border_style=color,
                        padding=(1, 2),
                    )
                )

                # Update History
                if action != "unknown":
                    self.history.append(f"User: {query}")
                    self.history.append(f"Agent: {responseText}")

                # 4. Context Selection Phase
                if details:
                    console.print(
                        f"\n[bold yellow]󰋚 System collected {len(details)} references.[/bold yellow]"
                    )
                    self.select_context(details)
                elif self.context:
                    # Allow user to clear/modify context even if no new details came back
                    if Confirm.ask("Manage current context?", default=False):
                        self.select_context([])

            except requests.exceptions.ConnectionError:
                console.print(
                    f"[bold red]FATAL: Could not connect to {API_URL}.[/bold red]"
                )
            except Exception as e:
                console.print(f"[bold red]ERROR: {e}[/bold red]")
                if "response" in locals():
                    console.print(
                        Panel(response.text, title="Debug Info", border_style="red")
                    )


if __name__ == "__main__":
    try:
        client = SearchClient()
        client.chat_loop()
    except KeyboardInterrupt:
        console.print("\n[bold]Goodbye![/bold]")
