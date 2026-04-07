import asyncio
from typing import List, Dict, Any

from ingestion import (
    context_builder,
    chunker,
    indexer,
    upload,
)
from ingestion.extract_docling import DoclingExtractor
import os
import time
import requests
import tempfile
import shutil
import mimetypes


class IngestionWorker:
    def __init__(self):
        self.context_builder = context_builder.ContextBuilder()
        self.extractor = DoclingExtractor()
        self.chunker = chunker.Chunker()
        self.indexer = indexer.Indexer()
        self.upload = upload.Upload()

    async def ingest(self, file_path: str, chunking: bool = True, format: bool = True, qdrant_upload: bool = True):
        print(f"Starting ingestion for file: {file_path}")
        try:
            print(f"Extractor...")
            result = self.extractor.convert(file_path)
            # print(doc_dict)
            # print(elements)
            raw = self.extractor.convert(file_path,'text')
            if not chunking:
                return raw

            print(f"Chunker...")
            summarized_chunks = self.chunker.chunk(result)
            if not format:
                return summarized_chunks

            print(f"Context Builder...")
            contexts = self.context_builder.build(summarized_chunks, file_path)
            if not qdrant_upload:
                return contexts

            res = await self.upload.upload(contexts)
            print(f"Uploaded {len(contexts)} chunks for file: {file_path}")
            # print(f"Upload response: {res}")
            return res

        except Exception as e:
            print(f"Error during ingestion of {file_path}: {e}")
            raise e

    def ingest_from_fss(self, file_id: str):
        """
        Trigger ingestion process for a file from File Storage Service.
        Updates FSS status: INDEXING → INDEXED on success, INDEX_FAILED on error.
        """
        print(f"Starting ingestion for file_id: {file_id}")
        self._update_fss_status(file_id, "INDEXING")
        try:
            self._download_and_process(file_id)
            self._update_fss_status(file_id, "INDEXED")
        except Exception as e:
            print(f"Ingestion failed for file_id {file_id}: {e}")
            self._update_fss_status(file_id, "INDEX_FAILED")

    def delete_index(self, file_id: str):
        """
        Remove file data from the vector index by looking up the filename in FSS
        then deleting all Qdrant chunks that belong to that file.
        """
        print(f"Deleting index for file_id: {file_id}")
        fss_url = os.getenv("FILE_STORAGE_URL", "http://127.0.0.1:8007")
        embedding_url = os.getenv("EMBEDDING_SERVICE_URL", "http://127.0.0.1:8003")
        try:
            # Use /meta instead of /download — works regardless of file status
            resp = requests.get(f"{fss_url}/files/{file_id}/meta")
            if resp.status_code == 404:
                print(f"File {file_id} not found in FSS, skipping vector deletion")
                return
            resp.raise_for_status()
            file_name = resp.json().get("file_name")
            if not file_name:
                print(f"No file_name for {file_id}, skipping vector deletion")
                return
            del_resp = requests.delete(
                f"{embedding_url}/v1/delete-by-file",
                params={"file_name": file_name},
            )
            del_resp.raise_for_status()
            print(f"Successfully deleted index for file: {file_name} (id={file_id})")
        except Exception as e:
            print(f"Error deleting index for file {file_id}: {e}")

    def _delete_vectors_by_name(self, file_name: str) -> None:
        """Best-effort delete of existing Qdrant vectors for a given filename."""
        embedding_url = os.getenv("EMBEDDING_SERVICE_URL", "http://127.0.0.1:8003")
        try:
            resp = requests.delete(
                f"{embedding_url}/v1/delete-by-file",
                params={"file_name": file_name},
            )
            if resp.status_code not in (200, 404):
                resp.raise_for_status()
            print(f"Cleared existing vectors for '{file_name}'")
        except Exception as e:
            print(f"Warning: could not delete existing vectors for '{file_name}': {e}")

    def _update_fss_status(self, file_id: str, status: str) -> None:
        """Push a status update back to the File Storage Service."""
        fss_url = os.getenv("FILE_STORAGE_URL", "http://127.0.0.1:8007")
        try:
            resp = requests.patch(
                f"{fss_url}/files/{file_id}/status",
                json={"status": status},
            )
            resp.raise_for_status()
            print(f"FSS status → {status} for file_id={file_id}")
        except Exception as e:
            print(f"Warning: could not update FSS status to {status} for {file_id}: {e}")

    def _download_and_process(self, file_id: str):
        fss_url = os.getenv("FILE_STORAGE_URL", "http://127.0.0.1:8007")

        # Get download URL
        resp = requests.get(f"{fss_url}/files/{file_id}/download")
        resp.raise_for_status()
        data = resp.json()
        download_url = data.get("download_url")
        file_name = data.get("file_name")

        if not download_url:
            raise RuntimeError(f"No download URL returned for file {file_id}")

        # Delete any previously indexed vectors for this file before re-ingesting
        if file_name:
            self._delete_vectors_by_name(file_name)

        # Prepare temporary directory to hold the file with its original name
        temp_dir = tempfile.mkdtemp()
        try:
            target_name = file_name or f"file_{file_id}"

            if "." not in target_name and "." in download_url:
                ext = "." + download_url.split('.')[-1].split('?')[0]
                target_name += ext

            tmp_path = os.path.join(temp_dir, target_name)

            with requests.get(download_url, stream=True) as r:
                r.raise_for_status()
                with open(tmp_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

            print(f"Downloaded file {file_id} to {tmp_path}")

            asyncio.run(self.ingest(tmp_path))
            print(f"Successfully ingested file {file_id}")

        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
