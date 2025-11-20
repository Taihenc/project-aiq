from __future__ import annotations

from typing import List, Optional, TypedDict, Dict, Any
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
    file: str # have
    page: int # have
    section: Optional[str] # dont know !!
    mime: str # have
    modality: str # have (text, picture, table)
    source_id: str # dont know !! // file path ... url where file from?
    checksum: str # calculated
    created_at: str # calculated
    parent: str # have
    children: List[str] # have

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
        return self.text_filter_selection(page_contents) + self.picture_filter_selection(page_contents) + self.table_filter_selection(page_contents)

    def _generate_id(self, *, file_path: str, page: int, idx: int) -> str:
        """
        Deterministic ID so re-ingesting the same source produces the same ID.
        Includes source_id to avoid collisions across different sources.
        """
        base = f"{self.source_id}|{file_path}|{page}|{idx}"
        return f"sha1:{sha1_bytes(base.encode('utf-8'))}"

    def text_filter_selection(self, page_contents: Any) -> List[ContextRecord]:
        texts = page_contents["texts"]

        contexts: List[ContextRecord] = []

        for idx, text in enumerate(texts):
            raw_text = text["text"] or ""
            cleaned_text = clean_text(raw_text)

            if not cleaned_text:
                continue

            file = page_contents["origin"]["filename"]
            page = text["prov"][0]["page_no"]

            metadata: ContextMetadata = {
                "file": file,
                "page": page,
                "section": text["label"],
                "mime": page_contents["origin"]["mimetype"],
                "modality": "text",
                "source_id": self.source_id,
                "checksum": sha1_bytes(cleaned_text.encode("utf-8")),
                "created_at": utc_now_iso(),
                "parent": "",
                "children": [],
            }

            record: ContextRecord = {
                "id": self._generate_id(file_path=file, page=page, idx=idx),
                "text": cleaned_text,
                "metadata": metadata,
            }

            contexts.append(record)

        return contexts
    
    def picture_filter_selection(self, page_contents: Any) -> List[ContextRecord]:
        pictures = page_contents["pictures"]

        contexts: List[ContextRecord] = []

        for idx, pic in enumerate(pictures):
            raw_text = "".join([annotation["text"] for annotation in pic.get("annotations", [])])
            cleaned_text = clean_text(raw_text)

            if not cleaned_text:
                continue

            file = page_contents["origin"]["filename"]
            page = pic["prov"][0]["page_no"]

            metadata: ContextMetadata = {
                "file": file,
                "page": page,
                "section": pic["label"],
                "mime": page_contents["origin"]["mimetype"],
                "modality": "picture",
                "source_id": self.source_id,
                "checksum": sha1_bytes(cleaned_text.encode("utf-8")),
                "created_at": utc_now_iso(),
                "parent": "",
                "children": [],
            }

            record: ContextRecord = {
                "id": self._generate_id(file_path=file, page=page, idx=idx),
                "text": cleaned_text,
                "metadata": metadata,
            }

            contexts.append(record)

        return contexts

    def table_filter_selection(self, page_contents: Any) -> List[ContextRecord]:
        tables = page_contents["tables"]

        contexts: List[ContextRecord] = []

        for idx, table in enumerate(tables):
            raw_text = self.table_extractor(table["data"])
            cleaned_text = clean_text(raw_text)

            if not cleaned_text:
                continue

            file = page_contents["origin"]["filename"]
            page = table["prov"][0]["page_no"]

            metadata: ContextMetadata = {
                "file": file,
                "page": page,
                "section": table["label"],
                "mime": page_contents["origin"]["mimetype"],
                "modality": "picture",
                "source_id": self.source_id,
                "checksum": sha1_bytes(cleaned_text.encode("utf-8")),
                "created_at": utc_now_iso(),
                "parent": "",
                "children": [],
            }

            record: ContextRecord = {
                "id": self._generate_id(file_path=file, page=page, idx=idx),
                "text": cleaned_text,
                "metadata": metadata,
            }

            contexts.append(record)

        return contexts


    def table_extractor(self, table) -> str:
        """
            write table extractor
        """

        table = str(table)

        return table