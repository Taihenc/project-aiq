from ingestion import (
    file_reader,
    modality,
    extractor,
    context_builder,
    chunker,
    indexer,
)
import os
import time

class IngestionWorker:
    def __init__(self):
        self.file_reader = file_reader.FileReader()
        self.modality = modality.ModalityClassifier()
        self.extractor = extractor.Extractor()
        self.context_builder = context_builder.ContextBuilder()
        self.chunker = chunker.Chunker()
        self.indexer = indexer.Indexer()

    def ingest(self, file_path: str):
        file_info = self.file_reader.read(file_path)
        for page in file_info.pages:
            modalities = self.modality.detect(page, file_info.mime_type)
            page_contents = []
            for modality in modalities:
                content = self.extractor.extract(modality.content, modality.type)
                page_contents.append(content)
            full_page_text = self.context_builder.build(page_contents)
            summarized_chunks = self.chunker.chunk(
                full_page_text
            )  # Recursive chunking + summarize each chunk
            self.indexer.index(summarized_chunks)

    def ingest_from_fss(self, file_id: str):
        """
        Trigger ingestion process for a file from File Storage Service.
        Currently in SIMULATION mode for PoC integration.
        """
        print(f" [Simulation] Starting ingestion for file_id: {file_id}")
        
        # Simulate processing time
        time.sleep(2)
        
        # In a real scenario, we would download and process:
        # self._download_and_process(file_id)
        
        print(f" [Simulation] Successfully ingested file: {file_id}")

    def delete_index(self, file_id: str):
        """
        Remove file data from the vector index.
        Currently in SIMULATION mode.
        """
        print(f" [Simulation] Deleting index for file_id: {file_id}")
        
        # Simulate processing time
        time.sleep(1)
        
        if self.initialized:
            # In real implementation: self.indexer.delete(file_id)
            pass
            
        print(f" [Simulation] Successfully deleted index for file: {file_id}")

    def _download_and_process(self, file_id: str):
        # ... (logic for downloading from FSS) ...
        import requests
        import tempfile
        
        fss_url = os.getenv("FILE_STORAGE_URL", "http://file-storage-service:8003")
        try:
            # Get download URL
            resp = requests.get(f"{fss_url}/files/{file_id}/download")
            resp.raise_for_status()
            download_url = resp.json().get("download_url")
            
            if not download_url:
                print(f"No download URL for file {file_id}")
                return

            # Download file to temp
            with requests.get(download_url, stream=True) as r:
                r.raise_for_status()
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    for chunk in r.iter_content(chunk_size=8192):
                        tmp.write(chunk)
                    tmp_path = tmp.name
            
            print(f"Downloaded file {file_id} to {tmp_path}")
            
            try:
                self.ingest(tmp_path)
                print(f"Successfully ingested file {file_id}")
            finally:
                os.unlink(tmp_path)
                
        except Exception as e:
            print(f"Error ingesting file {file_id}: {e}")
