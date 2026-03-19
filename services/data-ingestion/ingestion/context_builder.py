from __future__ import annotations
from typing import List, Optional, TypedDict, Dict, Any, Union
import os
import hashlib
from datetime import datetime
from urllib.parse import urlparse, unquote
import pandas as pd  # Required for the new CSV/Excel logic

# --- Data Models ---
class OrgMetadata(TypedDict):
    dept: str
    team: str
    project: str

class ContextMetadata(TypedDict, total=False):
    order: int
    file: str
    file_path: str
    file_type: str
    pages: List[int]
    section: Optional[str]
    tags: List[str]
    department: str
    team: str
    project: str
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
        self.mock_org: OrgMetadata = {
            "dept": "Engineering",
            "team": "AI",
            "project": "RAG-Service"
        }
        self.mock_tags = ["manual", "aws", "security", "infrastructure"]

    # --- Helper: Extract Image Descriptions from Docling Chunks ---
    def _extract_images_from_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        images = []
        for chunk in chunks:
            text = chunk.get("text", "")
            # Detect images based on your Docling extraction logic
            if "**[IMAGE CONTENT]**" in text or "### Embedded Images:" in text:
                images.append(text)
        return "\n".join(images)

    # --- Helper: Create Text Summary from DataFrame ---
    def _summarize_df(self, df: pd.DataFrame, file_type: str, sheet_name: str = "Main") -> str:
        rows, cols = df.shape
        col_list = ", ".join([f"{col} ({dtype})" for col, dtype in df.dtypes.items()])

        try:
            sample = df.head(5).to_markdown(index=False)
        except ImportError:
            sample = df.head(5).to_string(index=False)

        return (
            f"--- DATASET METADATA ---\n"
            f"File Type: {file_type} | Sheet: '{sheet_name}'\n"
            f"Dimensions: {rows} rows x {cols} columns\n"
            f"Columns: {col_list}\n"
            f"Sample Data:\n{sample}\n"
            f"------------------------"
        )

    def _resolve_display_name(self, actual_file_path: str, file_name: Optional[str], source_path: Optional[str]) -> str:
        if file_name:
            return file_name
        if source_path:
            parsed = urlparse(source_path)
            source_name = os.path.basename(parsed.path or source_path)
            if source_name:
                return unquote(source_name)
        return os.path.basename(actual_file_path)

    def build(
        self,
        chunk_input: Union[Dict[str, Any], List[Dict[str, Any]]],
        file_path: str,
        *,
        file_name: Optional[str] = None,
        source_path: Optional[str] = None,
        document_id_seed: Optional[str] = None,
    ) -> List[ContextRecord]:
        # 1. Standardize Input
        if isinstance(chunk_input, dict):
            chunks = [chunk_input]
        else:
            chunks = chunk_input if chunk_input else []

        records: List[ContextRecord] = []

        logical_path = source_path or file_path
        identity_seed = document_id_seed or logical_path
        filename = self._resolve_display_name(file_path, file_name, source_path)
        file_extension = os.path.splitext(filename)[1].replace(".", "").lower()
        timestamp = datetime.utcnow().isoformat() + "Z"

        # =========================================================
        # PATH A: CSV (Single Sheet = 1 Chunk)
        # =========================================================
        if file_extension == 'csv':
            try:
                df = pd.read_csv(file_path)
                summary_text = self._summarize_df(df, "CSV")

                checksum = hashlib.sha1(summary_text.encode("utf-8")).hexdigest()
                base_id = f"{identity_seed}|csv|{checksum[:8]}"
                record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

                records.append({
                    "id": record_id,
                    "text": summary_text,
                    "metadata": {
                        "file": filename,
                        "file_path": logical_path,
                        "file_type": file_extension,
                        "tags": self.mock_tags + ["structured_data"],
                        "order": 0,
                        "pages": [1],
                        "created_at": timestamp,
                        "checksum": checksum,
                        "is_summary": True,
                        "sheet_name": "Main",
                        "columns": [str(c) for c in df.columns.tolist()],
                        "department": self.mock_org["dept"],
                        "team": self.mock_org["team"],
                        "project": self.mock_org["project"]
                    }
                })
                return records
            except Exception as e:
                print(f"CSV Error: {e}")
                return []

        # =========================================================
        # PATH B: XLSX (1 Sheet = 1 Chunk + Images)
        # =========================================================
        elif file_extension in ['xlsx', 'xls']:
            try:
                # 1. Grab image descriptions from Docling input
                image_descriptions = self._extract_images_from_chunks(chunks)

                # 2. Read Excel Sheets
                xls = pd.read_excel(file_path, sheet_name=None)

                # 3. Create 1 Record per Sheet
                for i, (sheet_name, df) in enumerate(xls.items()):
                    summary_text = self._summarize_df(df, "Excel", sheet_name)

                    # Append images to the first sheet only (to avoid duplicates)
                    if i == 0 and image_descriptions:
                        summary_text += f"\n\n### Extracted Images:\n{image_descriptions}"

                    checksum = hashlib.sha1(summary_text.encode("utf-8")).hexdigest()
                    base_id = f"{identity_seed}|{sheet_name}|{checksum[:8]}"
                    record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

                    records.append({
                        "id": record_id,
                        "text": summary_text,
                        "metadata": {
                            "file": filename,
                            "file_path": logical_path,
                            "file_type": file_extension,
                            "tags": self.mock_tags + ["structured_data"],
                            "order": i,       # <--- Order matches Sheet Index
                            "pages": [i + 1], # Map Sheet 1 -> Page 1
                            "created_at": timestamp,
                            "checksum": checksum,
                            "is_summary": True,
                            "sheet_name": sheet_name,
                            "columns": [str(c) for c in df.columns.tolist()],
                            "department": self.mock_org["dept"],
                            "team": self.mock_org["team"],
                            "project": self.mock_org["project"]
                        }
                    })
                return records
            except Exception as e:
                print(f"XLSX Error: {e}")
                return []

        for i, chunk in enumerate(chunks):
            # SAFETY CHECK: If Docling returned something weird, skip it
            if not isinstance(chunk, dict):
                continue

            # 1. Keep text EXACTLY as it is
            raw_text = chunk.get("text", "")
            pages = chunk.get("page_nos", [])

            checksum = hashlib.sha1(raw_text.encode("utf-8")).hexdigest()
            base_id = f"{identity_seed}|{i}|{checksum[:8]}"
            record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

            metadata: ContextMetadata = {
                "order": i,
                "file": filename,
                "file_path": logical_path,
                "file_type": file_extension,
                "tags": self.mock_tags,
                "order": i,        # <--- Order is preserved here
                "pages": pages,
                # "section": primary_label,
                "created_at": timestamp,
                "checksum": checksum,
                "department": self.mock_org["dept"],
                "team": self.mock_org["team"],
                "project": self.mock_org["project"]
            }

            records.append({
                "id": record_id,
                "text": raw_text,
                "metadata": metadata,
            })

        return records
