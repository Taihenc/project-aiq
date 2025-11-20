from .context_builder import ContextMetadata, ContextRecord

import requests
from config import settings
from typing import List

class Upload:
    def __init__(self):
        self.API_URL = settings.api_url

    async def upload(self, contexts: List[ContextRecord]):

        documents = []

        for context in contexts:
            documents.append({
                "text": context["text"],
                "metadata": {
                    "path": context["metadata"]["file"]
                }
            })

        payload = {
            "documents": documents
        }

        res = requests.post(self.API_URL, json=payload)
        res.raise_for_status()

        return res.json()
