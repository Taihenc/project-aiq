"""
Reconciliation watchdog for stuck INDEXING files — lives in FSS.
Every `interval_seconds` the worker:
  1. Queries the local SQLite DB directly for files stuck in INDEXING status
     longer than `stuck_threshold_minutes`.
  2. Calls the embedding service (GET /v1/file-status?file_name=...) to check
     whether Qdrant actually holds vectors for the file.
  3. Writes the corrected status directly via the local update_status():
       - vectors found  → INDEXED
       - no vectors     → INDEX_FAILED
  4. Fires _notify_webhook() so the SSE event reaches the frontend.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.engine import Engine
from sqlmodel import Session, select

from db.models import File


class ReconciliationWorker:
    def __init__(
        self,
        engine: Engine,
        notify_webhook_fn,          # callable: (file_id, source_id, status, file_name)
        update_status_fn,           # callable: (file_id, status)
        interval_seconds: int = 300,
        stuck_threshold_minutes: int = 10,
    ) -> None:
        self.engine = engine
        self._notify_webhook = notify_webhook_fn
        self._update_status = update_status_fn
        self.interval = interval_seconds
        self.stuck_threshold = stuck_threshold_minutes
        self.embedding_url = os.getenv("EMBEDDING_SERVICE_URL", "http://127.0.0.1:8003")
        self.should_stop = False

    # ── public ────────────────────────────────────────────────────────────────

    def run_once(self) -> None:
        """Execute a single reconciliation pass. Safe to call manually for tests."""
        stuck = self._fetch_stuck_files_local()
        if not stuck:
            return

        logging.info("[reconciler] %d stuck INDEXING file(s) found", len(stuck))
        for file_info in stuck:
            file_id = file_info.get("file_id")
            file_name = file_info.get("file_name")
            source_id = file_info.get("source_id", "")
            if not file_id or not file_name:
                continue
            self._reconcile(file_id, file_name, source_id)

    def start(self) -> None:
        """Blocking loop — run in a daemon thread via start_in_thread()."""
        logging.info(
            "[reconciler] Started (interval=%ds, stuck_threshold=%dm)",
            self.interval, self.stuck_threshold,
        )
        while not self.should_stop:
            try:
                self.run_once()
            except Exception as exc:
                logging.warning("[reconciler] Unexpected error in run_once: %s", exc)
            time.sleep(self.interval)

    def start_in_thread(self) -> None:
        t = threading.Thread(target=self.start, daemon=True, name="reconciliation-worker")
        t.start()

    # ── private ───────────────────────────────────────────────────────────────

    def _fetch_stuck_files_local(self) -> list[dict]:
        """Query DB via SQLModel — no HTTP to ourselves."""
        threshold = (
            datetime.now(timezone.utc) - timedelta(minutes=self.stuck_threshold)
        ).isoformat()
        try:
            with Session(self.engine, expire_on_commit=False) as session:
                statement = select(File).where(
                    File.status == "INDEXING",
                    (File.status_updated_at == None) | (File.status_updated_at < threshold),  # noqa: E711 - SQLAlchemy column comparison must use `== None` to generate `IS NULL`
                )
                rows = session.exec(statement).all()
        except Exception as exc:
            logging.warning("[reconciler] DB query failed: %s", exc)
            return []

        return [
            {
                "file_id": row.id,
                "file_name": row.file_name,
                "source_id": row.source_id or "",
                "status_updated_at": row.status_updated_at,
            }
            for row in rows
        ]

    def _reconcile(self, file_id: str, file_name: str, source_id: str) -> None:
        """Check Qdrant via embedding service and correct the FSS record locally."""
        # ── Step 1: ask embedding service ─────────────────────────────────────
        try:
            with httpx.Client() as http:
                resp = http.get(
                    f"{self.embedding_url}/v1/file-status",
                    params={"file_name": file_name},
                    timeout=10.0,
                )
                resp.raise_for_status()
                data = resp.json()
            indexed: bool = data.get("indexed", False)
            chunk_count: int = data.get("chunk_count", 0)
        except Exception as exc:
            logging.warning(
                "[reconciler] Could not check embedding status for '%s' (%s): %s",
                file_name, file_id, exc,
            )
            return  # leave status as-is; probe again next cycle

        new_status = "INDEXED" if indexed else "INDEX_FAILED"
        logging.info(
            "[reconciler] '%s' (%s): %d chunk(s) in Qdrant → %s",
            file_name, file_id, chunk_count, new_status,
        )

        # ── Step 2: write directly to SQLite (local call, no HTTP) ────────────
        try:
            self._update_status(file_id, new_status)
            self._notify_webhook(file_id, source_id, new_status, file_name)
            logging.info(
                "[reconciler] Reconciled '%s' (%s) → %s", file_name, file_id, new_status
            )
        except Exception as exc:
            logging.warning(
                "[reconciler] Local status write failed for '%s' (%s): %s",
                file_name, file_id, exc,
            )
