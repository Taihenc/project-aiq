from __future__ import annotations
from typing import List, Optional, TypedDict, Dict, Any, Union
import os
import hashlib
from datetime import datetime
import pandas as pd  # Required for the new CSV/Excel logic

# --- Data Models ---
class OrgMetadata(TypedDict):
    dept: str
    team: str
    project: str

class ContextMetadata(TypedDict, total=False):
    org: OrgMetadata
    tags: List[str]
    file: str
    file_path: str
    file_type: str
    
    # "order" is crucial for reconstructing the page from chunks later
    order: int 
    
    # Specific page(s) this chunk belongs to (e.g. [1])
    # Note: Changed from 'page_numbers' to 'pages' to match your previous schema preference
    pages: List[int] 
    
    section: Optional[str]
    created_at: str
    checksum: str
    doc_metadata: Optional[Dict[str, Any]]
    
    # Extra fields for structured data tools
    is_summary: bool
    sheet_name: str
    columns: List[str]

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

    def build(self, chunk_input: Union[Dict[str, Any], List[Dict[str, Any]]], file_path: str) -> List[ContextRecord]:
        # 1. Standardize Input
        if isinstance(chunk_input, dict):
            chunks = [chunk_input]
        else:
            chunks = chunk_input if chunk_input else []

        records: List[ContextRecord] = []
        
        filename = os.path.basename(file_path)
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
                base_id = f"{file_path}|csv|{checksum[:8]}"
                record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

                records.append({
                    "id": record_id,
                    "text": summary_text,
                    "metadata": {
                        "org": self.mock_org,
                        "file": filename,
                        "file_path": file_path,
                        "file_type": file_extension,
                        "tags": self.mock_tags + ["structured_data"],
                        "order": 0,       # <--- Order 0 for the single CSV chunk
                        "pages": [1],
                        "created_at": timestamp,
                        "checksum": checksum,
                        "is_summary": True,
                        "sheet_name": "Main",
                        "columns": df.columns.tolist()
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
                    base_id = f"{file_path}|{sheet_name}|{checksum[:8]}"
                    record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

                    records.append({
                        "id": record_id,
                        "text": summary_text,
                        "metadata": {
                            "org": self.mock_org,
                            "file": filename,
                            "file_path": file_path,
                            "file_type": file_extension,
                            "tags": self.mock_tags + ["structured_data"],
                            "order": i,       # <--- Order matches Sheet Index
                            "pages": [i + 1], # Map Sheet 1 -> Page 1
                            "created_at": timestamp,
                            "checksum": checksum,
                            "is_summary": True,
                            "sheet_name": sheet_name,
                            "columns": df.columns.tolist()
                        }
                    })
                return records
            except Exception as e:
                print(f"XLSX Error: {e}")
                return []

        # =========================================================
        # PATH C: STANDARD DOCS (Your Original Logic)
        # =========================================================
        for i, chunk in enumerate(chunks):
            if not isinstance(chunk, dict): continue

            raw_text = chunk.get("text", "")
            pages = chunk.get("page_nos", [])
            
            checksum = hashlib.sha1(raw_text.encode("utf-8")).hexdigest()
            base_id = f"{file_path}|{i}|{checksum[:8]}"
            record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

            metadata: ContextMetadata = {
                "org": self.mock_org,
                "file": filename,
                "file_path": file_path,
                "file_type": file_extension,
                "tags": self.mock_tags,
                "order": i,        # <--- Order is preserved here
                "pages": pages,
                "created_at": timestamp,
                "checksum": checksum,
            }

            records.append({
                "id": record_id,
                "text": raw_text,
                "metadata": metadata,
            })

        return records