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
                    "order": metadata.get("order"),           # New: Required for reconstruction
                    "file": metadata.get("file"),
                    "file_path": metadata.get("file_path"),
                    "file_type": metadata.get("file_type"),
                    "pages": metadata.get("pages"),       # New: Changed from 'page' to 'pages'
                    "department": metadata.get("department"),       # New: Changed from 'page' to 'pages'
                    "project": metadata.get("project"),       # New: Changed from 'page' to 'pages'
                    "team": metadata.get("team"),       # New: Changed from 'page' to 'pages'
                    "tags": metadata.get("tags"),       # New: Changed from 'page' to 'pages'
                    # Include these for the Structured Data Tool to work
                    ###
                    "is_summary": metadata.get("is_summary"),
                    "sheet_name": metadata.get("sheet_name"),
                    "columns": metadata.get("columns"),
                    ###
                    "created_at": metadata.get("created_at"),
                    "checksum": metadata.get("checksum"),
                }
            })

        payload = {
            "documents": documents
        }
        
        res = requests.post(self.API_URL, json=payload)
        res.raise_for_status()

        return res.json()
