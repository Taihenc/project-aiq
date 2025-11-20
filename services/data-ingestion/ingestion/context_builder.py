from __future__ import annotations

from typing import List, Optional, TypedDict, Dict, Any
from uuid import uuid4
import re

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
        self.text_contents: List[ContextRecord] = []
        self.picture_contents: List[ContextRecord] = []
        self.table_contents: List[ContextRecord] = []
        self.roots: List[str] = []

    def build(self, page_contents: list) -> List[ContextRecord]:
        """Deprecated alias for build_contexts. Use build_contexts instead."""
        self.text_contents = self.text_filter_selection(page_contents)
        self.picture_contents = self.picture_filter_selection(page_contents)
        self.table_contents = self.table_filter_selection(page_contents)
        return self.merge_contents()


    def format_reference(self, raw: str) -> str:
        parts = raw.strip("#/").split("/")   # remove "#/" then split

        if len(parts) != 2:
            return None

        key, idx = parts[0], int(parts[1])
        
        if key == "texts":
            return self.text_contents[idx]["id"]
        if key == "pictures":
            return self.picture_contents[idx]["id"]
        if key == "tables":
            return self.table_contents[idx]["id"]

    def merge_contents(self) -> List[ContextRecord]:

        contents: Dict[str, ContextRecord] = {}
        for sections in [self.text_contents, self.picture_contents, self.table_contents]:
            for content in sections:
                raw_children = content["metadata"]["children"]
                formatted_children = [self.format_reference(child) for child in raw_children]

                content["metadata"]["children"] = formatted_children

                if content["metadata"]["parent"] == "#/body":
                    self.roots.append(content["id"])
                    content["metadata"]["parent"] = None
                else:
                    content["metadata"]["parent"] = self.format_reference(content["metadata"]["parent"])
                
                contents[content["id"]] = content

        merge_contents: List[ContextRecord] = []

        ### Simple Merge ###

        text = []
        for root in self.roots:
            self.pre_order_merge(contents[root], text, contents)
            
        merge_content: ContextRecord = {
            "id": "",
            "text": " ".join(text),
            "metadata": {
                "file": self.text_contents[0]["metadata"]["file"] or self.picture_contents[0]["metadata"]["file"] or self.table_contents[0]["metadata"]["file"],
            }
        }
        merge_contents.append(merge_content)
        ####################

        return merge_contents

    def pre_order_merge(self, content: ContextRecord, text, contents: Dict[str, ContextRecord]):
        text.append(content["text"])

        for child in content["metadata"]["children"]:
            self.pre_order_merge(contents[child], text, contents)


    def safe_get(self, data, *keys, default=None, pnt=False):
        """
        Safely access nested dict keys.
        Returns `default` if any key is missing.
        """
        for k in keys:
            if not isinstance(data, dict):
                return default
            data = data.get(k, default)
        return data


    def safe_get(self, data, *keys, default=None, pnt=False):
        """
        Safely access nested dict keys.
        Returns `default` if any key is missing.
        """
        for k in keys:
            if not isinstance(data, dict):
                return default
            data = data.get(k, default)
        return data


    def safe_get(self, data, *keys, default=None, pnt=False):
        """
        Safely access nested dict keys.
        Returns `default` if any key is missing.
        """
        for k in keys:
            if not isinstance(data, dict):
                return default
            data = data.get(k, default)
        return data


    def safe_get(self, data, *keys, default=None, pnt=False):
        """
        Safely access nested dict keys.
        Returns `default` if any key is missing.
        """
        for k in keys:
            if not isinstance(data, dict):
                return default
            data = data.get(k, default)
        return data


    def safe_get(self, data, *keys, default=None, pnt=False):
        """
        Safely access nested dict keys.
        Returns `default` if any key is missing.
        """
        for k in keys:
            if not isinstance(data, dict):
                return default
            data = data.get(k, default)
        return data


    def _generate_id(self, *, file_path: str, page: int, idx: int) -> str:
        """
        Deterministic ID so re-ingesting the same source produces the same ID.
        Includes source_id to avoid collisions across different sources.
        """
        base = f"{self.source_id}|{file_path}|{page}|{idx}"
        return f"sha1:{sha1_bytes(base.encode('utf-8'))}"

    def text_filter_selection(self, page_contents: Any) -> List[ContextRecord]:
        texts = page_contents.get("texts", [])
        contexts: List[ContextRecord] = []

        for idx, text in enumerate(texts):
            raw_text = text.get("text", "") or ""
            cleaned_text = clean_text(raw_text)

            file = self.safe_get(page_contents, "origin", "filename", default="")
            page = self.safe_get(text, "prov", 0, "page_no", default=0)
            label = text.get("label", "")

            metadata: ContextMetadata = {
                "file": file,
                "page": page,
                "section": label,
                "mime": self.safe_get(page_contents, "origin", "mimetype", default=""),
                "modality": "text",
                "source_id": self.source_id,
                "checksum": sha1_bytes(cleaned_text.encode("utf-8")),
                "created_at": utc_now_iso(),
                "parent": self.safe_get(text, "parent", "$ref", default=""),
                "children": [
                    self.safe_get(child, "$ref", default="") for child in self.safe_get(text, "children", default="")
                ],
            }

            record: ContextRecord = {
                "id": self._generate_id(file_path=file, page=page, idx=idx),
                "text": cleaned_text,
                "metadata": metadata,
            }

            contexts.append(record)

        return contexts


    def picture_filter_selection(self, page_contents: Any) -> List[ContextRecord]:
        pictures = page_contents.get("pictures", [])
        contexts: List[ContextRecord] = []

        for idx, pic in enumerate(pictures):
            annotations = pic.get("annotations", [])
            raw_text = "".join([a.get("text", "") for a in annotations])
            cleaned_text = clean_text(raw_text)

            file = self.safe_get(page_contents, "origin", "filename", default="")
            page = self.safe_get(pic, "prov", 0, "page_no", default=0)
            label = pic.get("label", "")

            metadata: ContextMetadata = {
                "file": file,
                "page": page,
                "section": label,
                "mime": self.safe_get(page_contents, "origin", "mimetype", default=""),
                "modality": "picture",
                "source_id": self.source_id,
                "checksum": sha1_bytes(cleaned_text.encode("utf-8")),
                "created_at": utc_now_iso(),
                "parent": self.safe_get(pic, "parent", "$ref", default=""),
                "children": [
                    self.safe_get(child, "$ref", default="") for child in self.safe_get(pic, "children", default="")
                ],
            }

            record: ContextRecord = {
                "id": self._generate_id(file_path=file, page=page, idx=idx),
                "text": cleaned_text,
                "metadata": metadata,
            }

            contexts.append(record)

        return contexts


    def table_filter_selection(self, page_contents: Any) -> List[ContextRecord]:
        tables = page_contents.get("tables", [])
        contexts: List[ContextRecord] = []

        for idx, table in enumerate(tables):
            desc_text = self.safe_get(table, "meta", "description", "text", default="")
            raw_text = self.table_extractor(desc_text)
            cleaned_text = clean_text(raw_text)

            file = self.safe_get(page_contents, "origin", "filename", default="")
            page = self.safe_get(table, "prov", 0, "page_no", default=0)
            label = table.get("label", "")

            metadata: ContextMetadata = {
                "file": file,
                "page": page,
                "section": label,
                "mime": self.safe_get(page_contents, "origin", "mimetype", default=""),
                "modality": "table",
                "source_id": self.source_id,
                "checksum": sha1_bytes(cleaned_text.encode("utf-8")),
                "created_at": utc_now_iso(),
                "parent": self.safe_get(table, "parent", "$ref", default=""),
                "children": [
                    self.safe_get(child, "$ref", default="") for child in self.safe_get(table, "children", default="")
                ],
            }

            record: ContextRecord = {
                "id": self._generate_id(file_path=file, page=page, idx=idx),
                "text": cleaned_text,
                "metadata": metadata,
            }

            contexts.append(record)

        return contexts


    def table_extractor(self, raw: str) -> str:
        if not raw:
            return ""

        text = raw

        # 1. Remove all <...> tags
        text = re.sub(r"<[^>]+>", " ", text)

        # 2. Replace newlines inside quotes or weird breaks
        text = text.replace("\\n", " ").replace("\n", " ")

        # 3. Fix hyphenated splits like "spa- tial" -> "spatial"
        text = re.sub(r"(\w+)-\s+(\w+)", r"\1\2", text)

        # 4. Remove extra spaces
        text = re.sub(r"\s+", " ", text).strip()

        return text
