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


# Default Corporate Metadata
DEFAULT_METADATA = {
    "user_info": {
        "id": "EMP-88219",
        "name": "Luffy",
        "role": "Senior Cloud Architect",
        "department": "Platform Engineering",
        "team": "AINGO Core Infrastructure",
        "clearance_level": "Level 4 (Confidential)",
    },
    "preferences": {
        "language": "Thai",
        "timezone": "Asia/Bangkok (GMT+7)",
    },
    "session_context": {
        "device": "MacBook Pro M3 Max",
        "network": "Corporate VPN (Secure)",
        "location": "SCB TechX HQ, Bangkok",
        "current_project": "Search Flow Optimization",
    },
}


class SearchClient:
    def __init__(self):
        self.history: List[str] = []
        self.attachments: List[Dict[str, Any]] = []  # List of FileRef objects
        self.session = requests.Session()
        self.mode = "auto"
        self.metadata = DEFAULT_METADATA

    def display_attachments(
        self,
        attachments: List[Dict] = None,
        show_ids: bool = False,
        new_start_idx: int = None,
    ):
        """
        Displays attachments as a tree.
        :param attachments: List of FileRef dicts (default: self.attachments)
        :param show_ids: If True, show [fN] and [#Row] indices
        :param new_start_idx: formatting helper, indices >= this are marked [NEW]
        """
        target_list = attachments if attachments is not None else self.attachments
        if not target_list:
            console.print("[dim]No active attachments loaded.[/dim]")
            return

        tree = Tree("[bold magenta]📎 Attachments[/bold magenta]")

        row_counter = 0

        for idx, item in enumerate(target_list):
            fp = item.get("file_path", "unknown")
            chunks = item.get("chunks", [])

            # Formatting File Node
            prefix = ""
            if show_ids:
                # Escape brackets for Rich: \\[f0]
                prefix += f"[bold blue]\\[f{idx}][/bold blue] "
            if new_start_idx is not None and idx >= new_start_idx:
                prefix += "[bold green]\\[NEW][/bold green] "

            file_node = tree.add(f"{prefix}[cyan]{fp}[/cyan] ({len(chunks)} chunks)")

            # Group by page
            by_page: Dict[int, list] = defaultdict(list)
            for c in chunks:
                by_page[c.get("page_number", 0)].append(c)

            for pg in sorted(by_page):
                pg_chunks = by_page[pg]
                pg_node = file_node.add(
                    f"[yellow]Page {pg}[/yellow] ({len(pg_chunks)} chunks)"
                )
                for c in pg_chunks:
                    chunk_num = c.get("chunk_number", "?")
                    score = c.get("score")

                    chunk_text = f"Chunk {chunk_num}"
                    if score is not None:
                        chunk_text += f" (score: {score})"

                    pg_node.add(f"[dim]{chunk_text}[/dim]")
                    row_counter += 1

        console.print(tree)

    def _merge_new_attachments(self, new_citations: List[Dict[str, Any]]):
        """
        Merges new citations into existing attachments.
        - Identical file_path: Merge chunks (avoiding duplicates by chunk_id)
        - New file_path: Add to list
        """
        if not new_citations:
            return

        # Map file_path -> {chunk_id -> chunk_data}
        existing_map = {}
        for att in self.attachments:
            fp = att.get("file_path")
            if not fp:
                continue

            if fp not in existing_map:
                existing_map[fp] = {}

            for chunk in att.get("chunks", []):
                cid = (
                    chunk.get("chunk_id")
                    or f"{chunk.get('page_number')}_{chunk.get('chunk_number')}"
                )
                existing_map[fp][cid] = chunk

        original_chunks_count = sum(len(c) for c in existing_map.values())

        # Merge new
        for new_att in new_citations:
            fp = new_att.get("file_path")
            if not fp:
                continue

            if fp not in existing_map:
                existing_map[fp] = {}

            for chunk in new_att.get("chunks", []):
                cid = (
                    chunk.get("chunk_id")
                    or f"{chunk.get('page_number')}_{chunk.get('chunk_number')}"
                )
                # Add if not exists
                if cid not in existing_map[fp]:
                    existing_map[fp][cid] = chunk

        # Reconstruct list
        merged_list = []
        for fp, chunks_map in existing_map.items():
            merged_list.append({"file_path": fp, "chunks": list(chunks_map.values())})

        self.attachments = merged_list

        new_total = sum(len(a.get("chunks", [])) for a in self.attachments)
        added = new_total - original_chunks_count

        if added > 0:
            console.print(
                f"[green]✓ Automatically merged {added} new chunk(s).[/green]"
            )
            self._print_result()
        else:
            console.print("[dim]No new unique chunks found to merge.[/dim]")

    def select_attachments(self, new_citations: List[Dict[str, Any]]):
        """
        Granular selection: user can pick by file, page, or individual chunk.
        Syntax:
            all / none / keep_old    — bulk shortcuts
            f0                       — all chunks from file 0
            f0p2                     — all chunks from file 0, page 2
            0,3,5                    — individual chunk rows by row number [#N]
            f0,3,f1p1               — mix of file, page, and chunk selections
        """
        # 1. Merge new citations first (User Request)
        if new_citations:
            self._merge_new_attachments(new_citations)

        if not self.attachments:
            return

        console.print(
            "\n[bold yellow]󰋚 Attachments Management (Merged View)[/bold yellow]"
        )

        # Candidates are now just the current state
        all_candidates = self.attachments

        # Build flat index for parsing
        rows, pages = _build_chunk_index(all_candidates)

        if not rows:
            console.print("[dim]No chunks available.[/dim]")
            return

        # ── Display Tree with Indices ──
        # We can't easily distinguish NEW here after merge without complex tracking,
        # so we disable the [NEW] tag for now or we could keep track of 'added' chunks but
        # simpler to just show current state.
        self.display_attachments(all_candidates, show_ids=True, new_start_idx=None)

        # ── Help ──
        rprint("\n[bold white]Select what to KEEP:[/bold white]")
        rprint("[dim]  all / none           — bulk shortcuts[/dim]")
        rprint("[dim]  f0          → entire file [f0][/dim]")
        rprint("[dim]  f0p2        → file 0, page 2 only[/dim]")
        rprint("[dim]  12          → chunks with number 12 (across all files)[/dim]")
        rprint("[dim]  f0c12       → file 0, chunk 12 only[/dim]")

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
        pat_file_chunk = re.compile(r"^f(\d+)c(\d+)$", re.IGNORECASE)
        pat_file = re.compile(r"^f(\d+)$", re.IGNORECASE)
        pat_chunk_num = re.compile(r"^\d+$")

        for tok in tokens:
            # fNpM
            m = pat_file_page.match(tok)
            if m:
                fi_sel, pg_sel = int(m.group(1)), int(m.group(2))
                if fi_sel in pages and pg_sel in pages[fi_sel]:
                    selected.update(pages[fi_sel][pg_sel])
                else:
                    console.print(
                        f"[red]⚠ f{fi_sel}p{pg_sel} not found or empty, skipping[/red]"
                    )
                continue

            # fNcM
            m = pat_file_chunk.match(tok)
            if m:
                fi_sel, c_sel = int(m.group(1)), int(m.group(2))
                found = False
                for ri, fi, fp, chunk in rows:
                    if fi == fi_sel and chunk.get("chunk_number") == c_sel:
                        selected.add(ri)
                        found = True
                if not found:
                    console.print(f"[red]⚠ f{fi_sel}c{c_sel} not found, skipping[/red]")
                continue

            # fN
            m = pat_file.match(tok)
            if m:
                fi_sel = int(m.group(1))
                # select all rows for this file
                found = False
                for ri, fi, fp, chunk in rows:
                    if fi == fi_sel:
                        selected.add(ri)
                        found = True
                if not found:
                    console.print(f"[red]⚠ f{fi_sel} not found, skipping[/red]")
                continue

            # Chunk Number Global
            m = pat_chunk_num.match(tok)
            if m:
                c_sel = int(tok)
                found = False
                for ri, fi, fp, chunk in rows:
                    # Match by chunk_number
                    if chunk.get("chunk_number") == c_sel:
                        selected.add(ri)
                        found = True
                if not found:
                    console.print(f"[red]⚠ Chunk {c_sel} not found in candidates[/red]")
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
                "[bold cyan]AINGO SEARCH FLOW[/bold cyan]\n[dim]AI-Powered Intelligence Engine[/dim]\n"
                "[dim]Commands: /chat, /search, /lookup, /auto, /metadata <json>, /reset[/dim]",
                subtitle="Type 'exit' to quit",
                border_style="cyan",
                padding=(1, 2),
            )
        )

        # Print Metadata on Startup
        rprint(
            Panel(
                json.dumps(self.metadata, indent=2),
                title="[bold magenta]User Metadata (Read-Only)[/bold magenta]",
                border_style="magenta",
                expand=False,
            )
        )

        while True:
            # 1. Input Phase
            self.display_attachments()
            mode_display = f"[bold magenta]Mode: {self.mode.upper()}[/bold magenta]"
            # Only showing Mode as Metadata is big and shown at start
            rprint(f"{mode_display}")

            query = Prompt.ask("\n[bold cyan]YOU[/bold cyan]")

            if query.lower() in ("exit", "quit"):
                break

            if not query.strip():
                continue

            # Command Handling
            if query == "/chat":
                self.mode = "chat"
                rprint("[green]Mode set to CHAT[/green]")
                continue

            if query == "/search":
                self.mode = "search"
                rprint("[green]Mode set to SEARCH[/green]")
                continue

            if query == "/lookup":
                self.mode = "lookup"
                rprint("[green]Mode set to LOOKUP[/green]")
                continue

            if query == "/auto":
                self.mode = "auto"
                rprint("[green]Mode set to AUTO[/green]")
                continue

            if query.startswith("/metadata "):
                parts = query.split(" ", 1)
                if len(parts) > 1:
                    try:
                        self.metadata = json.loads(parts[1].strip())
                        rprint(f"[green]Metadata updated: {self.metadata}[/green]")
                    except json.JSONDecodeError:
                        rprint("[red]Invalid JSON metadata[/red]")
                continue

            if query == "/reset":
                self.mode = "auto"
                self.metadata = DEFAULT_METADATA
                rprint("[green]Reset mode and metadata to defaults[/green]")
                rprint(
                    Panel(
                        json.dumps(self.metadata, indent=2),
                        title="[bold magenta]User Metadata[/bold magenta]",
                        border_style="magenta",
                        expand=False,
                    )
                )
                continue

            # 2. Sending Request
            payload = {
                "query": query,
                "history": self.history,
                "attachments": self.attachments,
                "mode": self.mode,
                "metadata": self.metadata,
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
                        title="[bold cyan]AGENT RESPONSE[/bold cyan]",
                        title_align="left",
                        border_style="cyan",
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
