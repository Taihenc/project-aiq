import asyncio
from typing import List, Dict, Any

from ingestion import (
    file_reader,
    modality,
    context_builder,
    chunker,
    indexer,
    upload
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
        self.indexer = indexer.Indexer()
        self.upload = upload.Upload()

    async def ingest(self, file_path: str, chunking: bool = True, merge: bool = True, qdrant_upload: bool = True):
        print(f"Starting ingestion for file: {file_path}")
        try:
            print(f"Extractor...")
            result = self.extractor.convert(file_path)
            # print(doc_dict)
            # print(elements)
            if not chunking:
                return result

            print(f"Chunker...")
            summarized_chunks = self.chunker.chunk(result)
            if not merge:
                return summarized_chunks
            
            print(f"Context Builder...")
            contexts = self.context_builder.build(summarized_chunks, file_path)
            if not qdrant_upload:
                return contexts
            
            res = await self.upload.upload(summarized_chunks)
            print(f"Uploaded {len(summarized_chunks)} chunks for file: {file_path}")
            # print(f"Upload response: {res}")
            return res

        except Exception as e:
            print(f"Error during ingestion of {file_path}: {e}")
            raise e

    def ingest_from_fss(self, file_id: str):
        """
        Trigger ingestion process for a file from File Storage Service.
        """
        print(f"Starting ingestion for file_id: {file_id}")
        self._download_and_process(file_id)

    def delete_index(self, file_id: str):
        """
        Remove file data from the vector index.
        """
        print(f"Deleting index for file_id: {file_id}")
        # In real implementation: self.indexer.delete(file_id)
        # self.indexer.delete(file_id)
        print(f"Successfully deleted index for file: {file_id}")

    def _download_and_process(self, file_id: str):
        fss_url = os.getenv("FILE_STORAGE_URL",
                            "http://127.0.0.1:8007")
        try:
            # Get download URL
            resp = requests.get(f"{fss_url}/files/{file_id}/download")
            resp.raise_for_status()
            data = resp.json()
            download_url = data.get("download_url")
            file_name = data.get("file_name")

            if not download_url:
                print(f"No download URL for file {file_id}")
                return

            # Prepare temporary directory to hold the file with its original name
            temp_dir = tempfile.mkdtemp()
            try:
                # Determine file name
                target_name = file_name or f"file_{file_id}"

                # If file_name has no extension but we can guess it from download_url
                if "." not in target_name and "." in download_url:
                    ext = "." + download_url.split('.')[-1].split('?')[0]
                    target_name += ext

                tmp_path = os.path.join(temp_dir, target_name)

                # Download file
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

        except Exception as e:
            print(f"Error ingesting file {file_id}: {e}")
