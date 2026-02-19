import requests
import json
import re
import sys
from typing import List, Dict, Any
from collections import defaultdict
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table
from rich.tree import Tree
from rich import print as rprint

# Configuration
API_URL = "http://localhost:8000/api/v1/completions"  # Port 8000 from settings.py
HEADERS = {"Content-Type": "application/json"}

console = Console()


def _build_chunk_index(all_files: List[Dict[str, Any]]):
    """
    Flatten all files into a list of (file_idx, chunk) tuples
    and build a page-level index for page selection.
    Returns:
        rows:  [(row_idx, file_idx, file_path, chunk_dict), ...]
        pages: {file_idx: {page_number: [row_idx, ...]}}
    """
    rows = []
    pages: Dict[int, Dict[int, List[int]]] = defaultdict(lambda: defaultdict(list))
    for fi, fref in enumerate(all_files):
        for chunk in fref.get("chunks", []):
            ri = len(rows)
            rows.append((ri, fi, fref.get("file_path", "?"), chunk))
            pg = chunk.get("page_number")
            if pg is not None:
                pages[fi][pg].append(ri)
    return rows, pages


def _rows_to_filerefs(rows, selected_indices: set) -> List[Dict[str, Any]]:
    """Re-group selected chunk rows back into FileRef dicts."""
    by_file: Dict[str, List[Dict]] = defaultdict(list)
    # Maintain file order from rows
    file_order = []
    for ri, fi, fp, chunk in rows:
        if ri in selected_indices:
            if fp not in by_file:
                file_order.append(fp)
            by_file[fp].append(chunk)
    return [{"file_path": fp, "chunks": by_file[fp]} for fp in file_order]


class SearchClient:
    def __init__(self):
        self.history: List[str] = []
        self.attachments: List[Dict[str, Any]] = []  # List of FileRef objects
        self.session = requests.Session()

    def display_attachments(self):
        """Displays the current active attachments (File-Based)."""
        if not self.attachments:
            console.print("[dim]No active attachments loaded.[/dim]")
            return

        tree = Tree("[bold magenta]📎 Active Attachments[/bold magenta]")
        for idx, item in enumerate(self.attachments):
            fp = item.get("file_path", "unknown")
            chunks = item.get("chunks", [])
            file_node = tree.add(f"[cyan]{fp}[/cyan] ({len(chunks)} chunks)")
            # group by page
            by_page: Dict[int, list] = defaultdict(list)
            for c in chunks:
                by_page[c.get("page_number", 0)].append(c)
            for pg in sorted(by_page):
                pg_chunks = by_page[pg]
                pg_node = file_node.add(
                    f"[yellow]Page {pg}[/yellow] ({len(pg_chunks)} chunks)"
                )
                for c in pg_chunks:
                    cid = c.get("chunk_id", "?")
                    score = c.get("score", "?")
                    pg_node.add(f"[dim]{cid[:8]}… score:{score}[/dim]")
        console.print(tree)

    def select_attachments(self, new_citations: List[Dict[str, Any]]):
        """
        Granular selection: user can pick by file, page, or individual chunk.
        Syntax:
            all / none / keep_old    — bulk shortcuts
            f0                       — all chunks from file 0
            f0p2                     — all chunks from file 0, page 2
            0,3,5                    — individual chunk rows by row number
            f0,3,f1p1               — mix of file, page, and chunk selections
        """
        if not new_citations and not self.attachments:
            return

        console.print("\n[bold yellow]󰋚 Attachments Management[/bold yellow]")

        # Combine existing and new
        all_candidates = self.attachments + new_citations
        old_count = len(self.attachments)

        # Build flat index
        rows, pages = _build_chunk_index(all_candidates)

        if not rows:
            console.print("[dim]No chunks available.[/dim]")
            return

        # ── Display Table ──
        table = Table(
            show_header=True, header_style="bold blue", show_lines=False, padding=(0, 1)
        )
        table.add_column("Row", style="bold white", width=4)
        table.add_column("File (fN)", style="bold cyan", width=6)
        table.add_column("Pg", style="bold yellow", width=4)
        table.add_column("Origin", style="dim", width=6)
        table.add_column("File Path", style="magenta", max_width=40)
        table.add_column("Chunk ID", style="dim", max_width=12)
        table.add_column("Score", style="green", width=7)

        prev_fi = None
        for ri, fi, fp, chunk in rows:
            origin = "OLD" if fi < old_count else "NEW"
            pg = str(chunk.get("page_number", "?"))
            cid = chunk.get("chunk_id", "?")[:12]
            score = str(chunk.get("score", "?"))
            # Show file path only on first row of each file
            show_fp = fp if fi != prev_fi else ""
            show_fi = f"f{fi}" if fi != prev_fi else ""
            table.add_row(str(ri), show_fi, pg, origin, show_fp, cid, score)
            prev_fi = fi

        console.print(table)

        # ── Help ──
        rprint("\n[bold white]Select what to KEEP:[/bold white]")
        rprint("[dim]  all / none / keep_old[/dim]")
        rprint("[dim]  f0          → entire file 0[/dim]")
        rprint("[dim]  f0p2        → file 0, page 2 only[/dim]")
        rprint("[dim]  0,3,5       → chunk rows 0, 3, 5[/dim]")
        rprint("[dim]  f0,3,f1p1   → mix allowed[/dim]")

        choice = Prompt.ask("Selection", default="all").strip()

        if choice.lower() == "all":
            self.attachments = all_candidates
            self._print_result()
            return
        elif choice.lower() == "none":
            self.attachments = []
            self._print_result()
            return
        elif choice.lower() == "keep_old":
            # keep self.attachments as-is
            self._print_result()
            return

        # ── Parse mixed selection ──
        selected: set = set()
        tokens = [t.strip() for t in choice.split(",") if t.strip()]

        # Regex patterns
        pat_file_page = re.compile(r"^f(\d+)p(\d+)$", re.IGNORECASE)
        pat_file = re.compile(r"^f(\d+)$", re.IGNORECASE)
        pat_row = re.compile(r"^\d+$")

        for tok in tokens:
            m = pat_file_page.match(tok)
            if m:
                fi_sel, pg_sel = int(m.group(1)), int(m.group(2))
                if fi_sel in pages and pg_sel in pages[fi_sel]:
                    selected.update(pages[fi_sel][pg_sel])
                else:
                    console.print(
                        f"[red]⚠ f{fi_sel}p{pg_sel} not found, skipping[/red]"
                    )
                continue

            m = pat_file.match(tok)
            if m:
                fi_sel = int(m.group(1))
                # select all rows for this file
                for ri, fi, fp, chunk in rows:
                    if fi == fi_sel:
                        selected.add(ri)
                continue

            m = pat_row.match(tok)
            if m:
                ri_sel = int(tok)
                if 0 <= ri_sel < len(rows):
                    selected.add(ri_sel)
                else:
                    console.print(f"[red]⚠ Row {ri_sel} out of range, skipping[/red]")
                continue

            console.print(f"[red]⚠ Unknown token '{tok}', skipping[/red]")

        # Rebuild FileRefs from selected rows
        self.attachments = _rows_to_filerefs(rows, selected)
        self._print_result()

    def _print_result(self):
        total_chunks = sum(len(a.get("chunks", [])) for a in self.attachments)
        total_files = len(self.attachments)
        rprint(
            f"[bold green]✓ {total_files} file(s), {total_chunks} chunk(s) active.[/bold green]\n"
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
                "[bold cyan]AINGO SEARCH FLOW[/bold cyan]\n[dim]AI-Powered Intelligence Engine[/dim]",
                subtitle="Type 'exit' to quit",
                border_style="cyan",
                padding=(1, 2),
            )
        )

        while True:
            # 1. Input Phase
            self.display_attachments()
            query = Prompt.ask("\n[bold cyan]YOU[/bold cyan]")

            if query.lower() in ("exit", "quit"):
                break

            if not query.strip():
                continue

            # 2. Sending Request
            payload = {
                "query": query,
                "history": self.history,
                "attachments": self.attachments,
            }

            try:
                with console.status(
                    "[bold cyan]Processing...[/bold cyan]", spinner="bouncingBar"
                ):
                    response = self.session.post(API_URL, json=payload, timeout=120)
                    response.raise_for_status()
                    api_response = response.json()
                    data = api_response.get("data", {})

                # 3. Output Phase
                action = data.get("action", "unknown")
                response_text = data.get("response", "")
                citations = data.get("citations") or []

                color = ACTION_COLORS.get(action, "white")

                rprint(
                    Panel(
                        Markdown(response_text),
                        title=f"[bold {color}]AGENT ACTION: {action.upper()}[/bold {color}]",
                        title_align="left",
                        border_style=color,
                        padding=(1, 2),
                    )
                )

                # Update History
                if action != "unknown":
                    self.history.append(f"User: {query}")
                    self.history.append(f"Agent: {response_text}")

                # 4. Attachments Selection Phase
                if citations:
                    rprint(
                        f"\n[bold yellow]󰋚 System collected {len(citations)} file reference(s).[/bold yellow]"
                    )
                    self.select_attachments(citations)
                elif self.attachments:
                    if Confirm.ask("Manage current attachments?", default=False):
                        self.select_attachments([])

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
