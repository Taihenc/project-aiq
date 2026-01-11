from .context_builder import ContextMetadata, ContextRecord

import requests
from config import settings
from typing import Any, Dict, List

class Upload:
    def __init__(self):
        self.API_URL = settings.api_url

    async def upload(self, contexts: List[Dict[str, Any]]):

        documents = []

        for context in contexts:
            documents.append({
                "id": context.get("id", ""),
                "text": context.get("text", ""),
                "metadata": {
                    "path": context.get("metadata", {}).get("file_path", "")
                }
            })

        payload = {
            "documents": documents
        }

        res = requests.post(self.API_URL, json=payload)
        res.raise_for_status()

        return res.json()
