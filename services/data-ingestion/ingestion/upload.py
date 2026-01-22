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
            documents.append({
                # "id": context.get("id", ""),
                "text": context.get("text", ""),
                "metadata": {
                    "file": context.get("metadata", {}).get("file", None),
                    "file_path": context.get("metadata", {}).get("file_path", None),
                    "file_type": context.get("metadata", {}).get("file_type", None),
                    "page": context.get("metadata", {}).get("page", None),
                    "created_at": context.get("metadata", {}).get("created_at", None),
                    "checksum": context.get("metadata", {}).get("checksum", None),
                }
            })

        payload = {
            "documents": documents
        }
        
        res = requests.post(self.API_URL, json=payload)
        res.raise_for_status()

        return res.json()
