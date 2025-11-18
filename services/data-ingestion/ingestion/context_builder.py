from __future__ import annotations

from typing import List, Optional, TypedDict
from uuid import uuid4

from ingestion.modality import detect_modality
from ingestion.file_reader import detect_mime
from ingestion.utils import sha1_bytes, clean_text, utc_now_iso


class ExtractedElement(TypedDict, total=False):
    """Minimal unit returned by extractors before context-building."""
    text: str
    page: int
    line: int
    section: Optional[str]


class ContextMetadata(TypedDict, total=False):
    file: str
    page: int
    line: int
    section: Optional[str]
    mime: str
    modality: str
    source_id: str
    checksum: str
    created_at: str


class ContextRecord(TypedDict):
    id: str
    text: str
    metadata: ContextMetadata


__all__ = ["ContextBuilder", "ContextRecord", "ExtractedElement"]


class ContextBuilder:
    """Builds structured context objects from extracted text blocks or pages."""

    def __init__(self, source_id: Optional[str] = None) -> None:
        self.source_id: str = source_id or str(uuid4())

    def build(self, page_contents: list) -> list:
        """Deprecated alias for build_contexts. Use build_contexts instead."""
        return self.build_contexts(page_contents)

    def build_contexts(
        self,
        elements: List[ExtractedElement],
        file_path: str,
        mime: Optional[str] = None,
    ) -> List[ContextRecord]:
        """
        Convert a list of extracted elements into standardized contexts.

        Args:
            elements: List of extracted elements with text, page, section, line info
            file_path: Path to the source file
            mime: Optional MIME type; detected if not provided

        Returns:
            List of normalized context records ready for chunking
        """
        resolved_mime = mime or detect_mime(file_path)
        modality = detect_modality(resolved_mime)

        contexts: List[ContextRecord] = []
        for idx, el in enumerate(elements):
            raw_text = el.get("text", "") or ""
            cleaned = clean_text(raw_text)
            if not cleaned:
                continue

            page = int(el.get("page", 1) or 1)
            line = int(el.get("line", 0) or 0)
            section = el.get("section")

            metadata: ContextMetadata = {
                "file": file_path,
                "page": page,
                "line": line,
                "section": section,
                "mime": resolved_mime,
                "modality": modality,
                "source_id": self.source_id,
                "checksum": sha1_bytes(cleaned.encode("utf-8")),
                "created_at": utc_now_iso(),
            }

            record: ContextRecord = {
                "id": self._generate_id(file_path=file_path, page=page, line=line, idx=idx),
                "text": cleaned,
                "metadata": metadata,
            }
            contexts.append(record)

        return contexts

    def _generate_id(self, *, file_path: str, page: int, line: int, idx: int) -> str:
        """
        Deterministic ID so re-ingesting the same source produces the same ID.
        Includes source_id to avoid collisions across different sources.
        """
        base = f"{self.source_id}|{file_path}|{page}|{line}|{idx}"
        return f"sha1:{sha1_bytes(base.encode('utf-8'))}"
