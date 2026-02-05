from __future__ import annotations
from typing import List, Optional, TypedDict, Dict, Any, Union
import os
import hashlib
from datetime import datetime
import pandas as pd  # Required for the new CSV/Excel logic

class ContextMetadata(TypedDict, total=False):
    order: int
    file: str
    file_path: str
    file_type: str
    pages: List[int]
    department: str
    project: str
    team: str
    tags: List[str]
    created_at: str
    checksum: str
    
    # Extra fields for structured data tools
    is_summary: Optional[bool]
    sheet_name: Optional[str]
    columns: Optional[List[str]]

class ContextRecord(TypedDict):
    id: str
    text: str
    metadata: ContextMetadata

class ContextBuilder:
    def __init__(self) -> None:
        pass

    def build(self, chunk_input: Union[Dict[str, Any], List[Dict[str, Any]]], file_path: str) -> List[ContextRecord]:
        """
        Processes Docling output. 
        If chunk_input is a single dict, it wraps it in a list.
        """
        # Fix for the AttributeError: Ensure we are always working with a list of dicts
        if isinstance(chunk_input, dict):
            chunks = [chunk_input]
        else:
            chunks = chunk_input if chunk_input else []

        records: List[ContextRecord] = []
        
        filename = os.path.basename(file_path)
        file_extension = os.path.splitext(filename)[1]
        timestamp = datetime.utcnow().isoformat() + "Z"

        for i, chunk in enumerate(chunks):
            # SAFETY CHECK: If Docling returned something weird, skip it
            if not isinstance(chunk, dict):
                continue

            # 1. Keep text EXACTLY as it is
            raw_text = chunk.get("text", "")
            
            # 2. Extract basic metadata for indexing
            pages = chunk.get("page_nos", [])
            doc_items = chunk.get("metadata", {}).get("doc_items", [])
            primary_label = str(doc_items[0].get("label")) if doc_items else "text"
            
            checksum = hashlib.sha1(raw_text.encode("utf-8")).hexdigest()
            base_id = f"{file_path}|{pages[0] if pages else 0}|{checksum[:8]}"
            record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

            # 4. Construct the record
            metadata: ContextMetadata = {
                "order": i,
                "file": filename,
                "file_path": file_path,
                "file_type": file_extension,
                "pages": pages,
                "department": "AI", # mock up
                "project": "AINGO", # mock up
                "team": "AiQ", # mock up
                "tags": ["AI", "AINGO", "AiQ"], # mock up
                "created_at": timestamp,
                "checksum": checksum,
            }

            records.append({
                "id": record_id,
                "text": raw_text,
                "metadata": metadata,
            })

        return records