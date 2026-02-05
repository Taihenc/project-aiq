from __future__ import annotations
from typing import List, Optional, TypedDict, Dict, Any, Union
import os
import hashlib
from datetime import datetime

# Define the nested Org structure
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
    page_numbers: List[int] 
    
    # Optional: Total pages in file (if available in doc_metadata)
    total_pages: Optional[int] 
    
    section: Optional[str]
    created_at: str
    checksum: str
    doc_metadata: Optional[Dict[str, Any]]

class ContextRecord(TypedDict):
    id: str
    text: str
    metadata: ContextMetadata

class ContextBuilder:
    def __init__(self) -> None:
        # Mock Data as requested for the structure
        self.mock_org: OrgMetadata = {
            "dept": "Engineering",
            "team": "AI",
            "project": "RAG-Service"
        }
        self.mock_tags = ["manual", "aws", "security", "infrastructure"]

    def build(self, chunk_input: Union[Dict[str, Any], List[Dict[str, Any]]], file_path: str) -> List[ContextRecord]:
        """
        Processes Docling output chunks.
        Adds 'order', 'org', and 'tags' to allow page reconstruction from chunks.
        """
        # Ensure we are always working with a list of dicts
        if isinstance(chunk_input, dict):
            chunks = [chunk_input]
        else:
            chunks = chunk_input

        records: List[ContextRecord] = []
        
        # File info parsing
        filename = os.path.basename(file_path)
        file_extension = os.path.splitext(filename)[1].replace(".", "") # e.g. 'pdf' instead of '.pdf'
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Enumerate to get the ORDER of chunks
        for i, chunk in enumerate(chunks):
            # SAFETY CHECK
            if not isinstance(chunk, dict):
                continue

            # 1. Keep text EXACTLY as it is
            raw_text = chunk.get("text", "")
            
            # 2. Extract basic metadata
            # Note: We rename 'page_nos' to 'page_numbers' for clarity in the new schema
            # but keep the list type so we know exactly which page(s) this chunk covers.
            pages = chunk.get("page_nos", [])
            
            # Try to find total pages if available in the original doc metadata
            doc_meta = chunk.get("metadata", {})
            doc_items = doc_meta.get("doc_items", [])
            # primary_label = str(doc_items[0].get("label")) if doc_items else "text"
            
            # 3. Generate deterministic ID
            checksum = hashlib.sha1(raw_text.encode("utf-8")).hexdigest()
            # ID is now tied to the ORDER as well to ensure uniqueness per chunk position
            base_id = f"{file_path}|{i}|{checksum[:8]}"
            record_id = hashlib.sha1(base_id.encode("utf-8")).hexdigest()

            # 4. Construct the metadata following your new schema
            metadata: ContextMetadata = {
                "org": self.mock_org,
                "file": filename,
                "file_path": file_path,
                "file_type": file_extension,
                "tags": self.mock_tags,
                
                # The Critical New Field for reconstruction
                "order": i, 
                
                # Location info
                "pages": pages,
                
                "created_at": timestamp,
                "checksum": checksum,
                # "doc_metadata": doc_meta # Uncomment if you still need the raw extra data
            }

            records.append({
                "id": record_id,
                "text": raw_text,
                "metadata": metadata,
            })

        return records