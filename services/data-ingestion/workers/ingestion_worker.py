import asyncio
from typing import List, Dict, Any

from ingestion import (
    context_builder,
    chunker,
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
        # self.file_reader = file_reader.FileReader()
        # self.modality = modality.ModalityClassifier()
        # self.extractor = extractor.Extractor()
        self.context_builder = context_builder.ContextBuilder()
        self.extractor = DoclingExtractor()
        self.chunker = chunker.Chunker()
        self.upload = upload.Upload()

    async def ingest(
        self,
        file_path: str,
        chunking: bool = True,
        format: bool = True,
        qdrant_upload: bool = True,
        file_id: str | None = None,
        source_id: str | None = None,
        display_name: str | None = None,
        source_path: str | None = None,
    ):
        display_label = display_name or source_path or file_path
        print(f"Starting ingestion for file: {display_label}")
        try:
            print(f"Extractor...")
            result = self.extractor.convert(file_path)
            if not chunking:
                return result.export_to_text()

            print(f"Chunker...")
            summarized_chunks = self.chunker.chunk(result)
            if not format:
                return summarized_chunks

            print(f"Context Builder...")
            contexts = self.context_builder.build(
                summarized_chunks,
                file_path,
                file_name=display_name,
                source_path=source_path,
                document_id_seed=file_id or source_id or source_path,
            )
            if not qdrant_upload:
                return contexts

            res = await self.upload.upload(contexts, file_id=file_id, source_id=source_id)
            print(f"Uploaded {len(contexts)} chunks for file: {display_label}")
            # print(f"Upload response: {res}")
            return res

        except Exception as e:
            print(f"Error during ingestion of {display_label}: {e}")
            raise e

    def ingest_from_fss(self, file_id: str):
        """
        Trigger ingestion process for a file from File Storage Service.
        Updates FSS status: INDEXING → INDEXED on success, INDEX_FAILED on error.
        Handles idempotency: if file is already INDEXING, proceeds without error.
        """
        print(f"Starting ingestion for file_id: {file_id}")

        # Ensure we are in INDEXING state (idempotent check)
        try:
            current_status = self._get_fss_status(file_id)
            if current_status == "INDEXING":
                print(f"File {file_id} already in INDEXING state, proceeding")
            elif current_status == "COMPLETED":
                self._update_fss_status(file_id, "INDEXING")
            else:
                # Unexpected state; try to transition anyway
                print(f"File {file_id} in state {current_status}, attempting to set INDEXING")
                self._update_fss_status(file_id, "INDEXING")
        except Exception as e:
            print(f"Failed to get/update status to INDEXING for {file_id}: {e}")
            # If we cannot determine or set status, we should fail
            self._update_fss_status(file_id, "INDEX_FAILED")
            return

        try:
            self._download_and_process(file_id)
            self._update_fss_status(file_id, "INDEXED")
        except Exception as e:
            print(f"Ingestion failed for file_id {file_id}: {e}")
            self._update_fss_status(file_id, "INDEX_FAILED")

    def delete_index(self, file_id: str):
        """
        Remove file data from the vector index using stable identity, with
        file-name fallback for legacy vectors.
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
            payload = resp.json()
            file_name = payload.get("file_name")
            del_params = {"file_id": file_id}
            if file_name:
                del_params["file_name"] = file_name
            del_resp = requests.delete(f"{embedding_url}/v1/delete-by-file", params=del_params)
            if del_resp.status_code not in (200, 404):
                del_resp.raise_for_status()
            print(f"Successfully deleted index for file: {file_name} (id={file_id})")
        except Exception as e:
            print(f"Error deleting index for file {file_id}: {e}")

    def _delete_vectors(self, *, file_id: str, file_name: str | None = None, previous_file_name: str | None = None) -> None:
        """Best-effort delete using stable file_id plus filename fallback for legacy vectors."""
        embedding_url = os.getenv("EMBEDDING_SERVICE_URL", "http://127.0.0.1:8003")

        delete_candidates = []
        if file_id:
            delete_candidates.append({"file_id": file_id, "file_name": file_name} if file_name else {"file_id": file_id})
        if file_name:
            delete_candidates.append({"file_name": file_name})
        if previous_file_name and previous_file_name != file_name:
            delete_candidates.append({"file_name": previous_file_name})

        seen: set[tuple[tuple[str, str], ...]] = set()
        for params in delete_candidates:
            key = tuple(sorted((k, str(v)) for k, v in params.items() if v))
            if not key or key in seen:
                continue
            seen.add(key)
            try:
                resp = requests.delete(f"{embedding_url}/v1/delete-by-file", params=params)
                if resp.status_code not in (200, 404):
                    resp.raise_for_status()
                print(f"Cleared existing vectors using {params}")
            except Exception as e:
                print(f"Warning: could not delete existing vectors using {params}: {e}")

    def _get_fss_status(self, file_id: str) -> str:
        """Get current file status from FSS."""
        fss_url = os.getenv("FILE_STORAGE_URL", "http://127.0.0.1:8007")
        resp = requests.get(f"{fss_url}/files/{file_id}/meta", timeout=5)
        resp.raise_for_status()
        return resp.json()["status"]

    def _update_fss_status(self, file_id: str, status: str) -> None:
        """Push a status update back to FSS with exponential-backoff retry (Fix 4)."""
        import logging
        fss_url = os.getenv("FILE_STORAGE_URL", "http://127.0.0.1:8007")
        delays = [2, 6, 18]
        last_exc: Exception | None = None
        for attempt, delay in enumerate(delays, 1):
            try:
                resp = requests.patch(
                    f"{fss_url}/files/{file_id}/status",
                    json={"status": status},
                    timeout=5,
                )
                resp.raise_for_status()
                print(f"FSS status → {status} for file_id={file_id}")
                return
            except Exception as e:
                last_exc = e
                if attempt < len(delays):
                    print(f"[fss-status] attempt {attempt} failed, retrying in {delay}s: {e}")
                    time.sleep(delay)
        logging.error(
            "[fss-status] Exhausted retries updating %s for file_id=%s: %s",
            status, file_id, last_exc,
        )
        if last_exc is None:
            raise RuntimeError(f"Failed to update FSS status for file_id={file_id}")
        raise last_exc

    def _download_and_process(self, file_id: str):
        fss_url = os.getenv("FILE_STORAGE_URL", "http://127.0.0.1:8007")

        # Get download URL
        resp = requests.get(f"{fss_url}/files/{file_id}/download")
        resp.raise_for_status()
        data = resp.json()
        download_url = data.get("download_url")
        file_name = data.get("file_name")
        source_id = data.get("source_id")
        metadata = data.get("metadata") or {}
        previous_file_name = metadata.get("_previous_file_name")
        source_path = metadata.get("webUrl") or file_name or download_url

        if not download_url:
            raise RuntimeError(f"No download URL returned for file {file_id}")

        self._delete_vectors(file_id=file_id, file_name=file_name, previous_file_name=previous_file_name)

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

            asyncio.run(
                self.ingest(
                    tmp_path,
                    file_id=file_id,
                    source_id=source_id,
                    display_name=file_name,
                    source_path=source_path,
                )
            )
            print(f"Successfully ingested file {file_id}")

        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
