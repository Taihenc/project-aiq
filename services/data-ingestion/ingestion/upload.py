import requests
from config import settings
from typing import Any, Dict, Mapping, Sequence

class Upload:
    def __init__(self):
        self.API_URL = settings.api_url

    async def upload(
        self,
        contexts: Sequence[Mapping[str, Any]],
        file_id: str | None = None,
        source_id: str | None = None,
    ):

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
                    "file_id": file_id,
                    "source_id": source_id,
                }
            })

        payload: dict = {"documents": documents}
        # Propagate file_id so the embedding service can optionally PATCH FSS
        # directly via FSS_CALLBACK_URL (belt-and-suspenders path).
        if file_id:
            payload["file_id"] = file_id

        res = requests.post(self.API_URL, json=payload)
        try:
            res.raise_for_status()
        except requests.exceptions.HTTPError as e:
            print(f"Upload failed. Status: {res.status_code}, Response: {res.text}")
            raise e

        return res.json()
