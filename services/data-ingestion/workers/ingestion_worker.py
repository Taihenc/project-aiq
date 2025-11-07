import asyncio
from typing import List, Dict, Any

from ingestion import (
    file_reader,
    modality,
    context_builder,
    chunker,
)
from embedding.client import EmbeddingClient

from ingestion.extractor import (
    extractor
)


class IngestionWorker:
    def __init__(
        self,
        embedding_service_url: str = None,
        chunk_size: int = 512,
        chunk_overlap: int = 128,
    ):
        """
        Initialize the ingestion worker.

        Args:
            embedding_service_url: URL of the embedding-service
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between consecutive chunks
        """
        self.file_reader = file_reader.FileReader()
        self.modality = modality.Modality()
        self.extractor = extractor.Extractor()
        self.context_builder = context_builder.ContextBuilder()
        self.chunker = chunker.Chunker(
            chunk_size=chunk_size, chunk_overlap=chunk_overlap
        )
        self.embedding_client = EmbeddingClient(base_url=embedding_service_url)

    def ingest(self, file_path: str) -> Dict[str, Any]:
        """
        Synchronous wrapper for async ingest operation.

        Args:
            file_path: Path to the file to ingest

        Returns:
            Dict with ingestion results (file_path, pages_processed, chunks_uploaded)
        """
        return asyncio.run(self.ingest_async(file_path))

    async def ingest_async(self, file_path: str) -> Dict[str, Any]:
        """
        Ingest a file through the complete pipeline:
        file_reader -> extractor -> context_builder -> chunker -> embedding_client

        Args:
            file_path: Path to the file to ingest

        Returns:
            Dict with ingestion results including chunk IDs
        """
        try:
            file_info = self.file_reader.read(file_path)
            all_chunks: List[Dict[str, Any]] = []
            pages_processed = 0

            # Process each page in the file
            for page in file_info.pages:
                modalities = self.modality.detect(page, file_info.mime_type)
                page_contents = []

                # Extract content from each modality (text, images, etc.)
                for mod in modalities:
                    content = self.extractor.extract(mod.content, mod.type)
                    page_contents.append(content)

                # Build normalized context records
                context_records = self.context_builder.build_contexts(
                    page_contents, file_path=file_path, mime=file_info.mime_type
                )

                # Chunk the context records
                chunked_records = self.chunker.chunk(context_records)

                # Convert to document format for embedding service
                documents = [
                    {
                        "text": chunk["text"],
                        "metadata": chunk["metadata"],
                    }
                    for chunk in chunked_records
                ]
                all_chunks.extend(documents)
                pages_processed += 1

            # Upload all chunks to embedding service
            if all_chunks:
                async with EmbeddingClient(
                    base_url=self.embedding_client.base_url
                ) as client:
                    chunk_ids = await client.upload_documents(all_chunks)
                    result = {
                        "file_path": file_path,
                        "pages_processed": pages_processed,
                        "chunks_uploaded": len(chunk_ids),
                        "chunk_ids": chunk_ids,
                        "status": "success",
                    }
            else:
                result = {
                    "file_path": file_path,
                    "pages_processed": pages_processed,
                    "chunks_uploaded": 0,
                    "chunk_ids": [],
                    "status": "success",
                    "message": "No chunks generated",
                }

            return result

        except Exception as e:
            return {
                "file_path": file_path,
                "status": "error",
                "error": str(e),
            }
