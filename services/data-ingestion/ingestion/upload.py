from .context_builder import ContextMetadata, ContextRecord

import requests
from config import settings
from typing import Any, Dict, List
import json

class Upload:
    def __init__(self):
        self.API_URL = settings.api_url

    async def upload(self, contexts: List[Dict[str, Any]]):

        documents = []

        for context in contexts:
            metadata = context.get("metadata", {})
            
            # Construct the payload to match the DocumentUploadRequest model
            documents.append({
                "id": context.get("id"),
                "text": context.get("text"),
                "metadata": {
                    "file": metadata.get("file"),
                    "file_path": metadata.get("file_path"),
                    "file_type": metadata.get("file_type"),
                    "order": metadata.get("order"),           # New: Required for reconstruction
                    "pages": metadata.get("pages", []),       # New: Changed from 'page' to 'pages'
                    "created_at": metadata.get("created_at"),
                    "checksum": metadata.get("checksum"),
                    # Include these for the Structured Data Tool to work
                    "is_summary": metadata.get("is_summary", False),
                    "sheet_name": metadata.get("sheet_name"),
                    "columns": metadata.get("columns", [])
                }
            })

        payload = {
            "documents": documents
        }
        
        res = requests.post(self.API_URL, json=payload)
        res.raise_for_status()

        return res.json()
