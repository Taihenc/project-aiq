from typing import List, Optional, TypedDict, Union
from ingestion.context_builder import ContextRecord, ContextMetadata


class ChunkedRecord(TypedDict):
    """A chunked unit with chunk info added to metadata."""
    id: str
    text: str
    metadata: ContextMetadata


class Chunker:
    """
    Recursively splits text into smaller chunks with optional overlap.
    Adds chunk metadata (chunk_index, chunk_total, chunk_size) to each record.
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 128,
        delimiters: Optional[List[str]] = None,
    ):
        """
        Args:
            chunk_size: Target size of each chunk in characters
            chunk_overlap: Number of overlapping characters between chunks
            delimiters: List of delimiters to try when splitting (in order of preference)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.delimiters = delimiters or ["\n\n", "\n", ". ", " "]

    def chunk(
        self, contexts: Union[List[ContextRecord], str]
    ) -> List[ChunkedRecord]:
        """
        Chunk a list of context records or a single text string.

        Args:
            contexts: Either a list of ContextRecord dicts or a single text string

        Returns:
            List of chunked records with updated metadata
        """
        # Handle single string input for backward compatibility
        if isinstance(contexts, str):
            return self._chunk_text(contexts, base_metadata={})

        # Process list of context records
        chunked_records: List[ChunkedRecord] = []
        for context in contexts:
            text = context["text"]
            metadata = context["metadata"]

            text_chunks = self._chunk_text(text, base_metadata=metadata)
            chunked_records.extend(text_chunks)

        return chunked_records

    def _chunk_text(
        self, text: str, base_metadata: dict
    ) -> List[ChunkedRecord]:
        """
        Recursively split a single text into chunks.

        Args:
            text: The text to chunk
            base_metadata: Base metadata dict to attach to each chunk

        Returns:
            List of chunked records
        """
        if not text or len(text) <= self.chunk_size:
            # Text fits in single chunk
            return [
                {
                    "id": f"{base_metadata.get('source_id', 'unknown')}|chunk_0_0",
                    "text": text,
                    "metadata": {
                        **base_metadata,
                        "chunk_index": 0,
                        "chunk_total": 1,
                        "chunk_size": len(text),
                    },
                }
            ]

        # Split recursively using preferred delimiters
        chunks = self._split_recursive(text, delimiter_idx=0)

        # Add chunk metadata to each
        records: List[ChunkedRecord] = []
        for idx, chunk_text in enumerate(chunks):
            record: ChunkedRecord = {
                "id": f"{base_metadata.get('source_id', 'unknown')}|chunk_{idx}_{len(chunks)}",
                "text": chunk_text,
                "metadata": {
                    **base_metadata,
                    "chunk_index": idx,
                    "chunk_total": len(chunks),
                    "chunk_size": len(chunk_text),
                },
            }
            records.append(record)

        return records

    def _split_recursive(self, text: str, delimiter_idx: int = 0) -> List[str]:
        """
        Recursively split text using delimiters in order of preference.

        Args:
            text: Text to split
            delimiter_idx: Current index in delimiters list

        Returns:
            List of text chunks
        """
        if delimiter_idx >= len(self.delimiters):
            # Fallback: split by fixed character count with overlap
            return self._split_by_size(text)

        delimiter = self.delimiters[delimiter_idx]
        splits = text.split(delimiter)

        # Rejoin splits until they reach target size
        chunks = []
        current_chunk = ""

        for i, split in enumerate(splits):
            test_chunk = (
                current_chunk + delimiter + split
                if current_chunk
                else split
            )

            if len(test_chunk) <= self.chunk_size:
                current_chunk = test_chunk
            else:
                # Current chunk would exceed size limit
                if current_chunk:
                    # Save current chunk and start new one
                    chunks.append(current_chunk)
                    # Apply overlap if possible
                    if self.chunk_overlap > 0 and len(split) < self.chunk_size:
                        overlap_text = current_chunk[-self.chunk_overlap:]
                        current_chunk = overlap_text + delimiter + split
                    else:
                        current_chunk = split
                else:
                    # Single split is larger than chunk_size, recurse with next delimiter
                    sub_chunks = self._split_recursive(split, delimiter_idx + 1)
                    chunks.extend(sub_chunks)
                    current_chunk = ""

        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    def _split_by_size(self, text: str) -> List[str]:
        """
        Split text by fixed character count with overlap (last resort).

        Args:
            text: Text to split

        Returns:
            List of fixed-size chunks
        """
        if not text:
            return []

        chunks = []
        start = 0

        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            chunks.append(text[start:end])
            start = end - self.chunk_overlap if self.chunk_overlap > 0 else end

        return chunks
