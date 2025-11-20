from .summarizer import Summarizer
from .context_builder import ContextMetadata, ContextRecord
from config import settings

from typing import List, Sequence
from ingestion.utils import sha1_bytes


class Chunker:
    def __init__(self):
        self.summarizer = Summarizer()
        self.MAX_CHUNK_SIZE = settings.max_chunk_size
        self.CHUNK_OVERLAP = settings.chunk_overlap
        self.SPLITTERS: Sequence[str] = [
            "\n\n",  # paragraph
            "\n",    # line
            ". ",    # sentence
            " ",     # word
        ]

    def chunk(self, full_page_text: List[ContextRecord]) -> List[ContextRecord]:
        return self._recursive_chunk(full_page_text)

    def _recursive_chunk(self, full_page_text: List[ContextRecord]) -> List[ContextRecord]:
        # First get raw chunks (no overlap)
        base_chunks: List[ContextRecord] = []
        for r in full_page_text:
            base_chunks.extend(self._recursion(r))

        # Add overlap between consecutive chunks
        overlapped: List[ContextRecord] = []

        for i, rec in enumerate(base_chunks):
            text = rec["text"]

            # First chunk → no overlap backward
            if i == 0:
                overlapped.append(rec)
                continue

            prev = overlapped[-1]
            prev_text = prev["text"]

            # Compute backward overlap from previous chunk
            overlap_text = prev_text[-self.CHUNK_OVERLAP:] if self.CHUNK_OVERLAP < len(
                prev_text) else prev_text

            new_text = overlap_text + text
            new_rec = {
                "id": f"{rec['id']}_ol",
                "text": new_text,
                "metadata": rec["metadata"],
            }

            overlapped.append(new_rec)

        return overlapped

    def find_split_index(self, text: str) -> int:
        """
        Return the best split index using splitters, or fallback to midpoint.
        """
        midpoint = len(text) // 2

        for splitter in self.SPLITTERS:
            idx = text.rfind(splitter, 0, midpoint)
            if idx != -1:
                return idx + len(splitter)

        return midpoint

    def _recursion(self, record: ContextRecord) -> List[ContextRecord]:
        """
        Recursively split a record until each chunk is <= MAX_CHUNK_SIZE.
        """
        text = record["text"]

        if len(text) <= self.MAX_CHUNK_SIZE:
            return [record]

        split_idx = self.find_split_index(text)

        part1 = text[:split_idx].strip()
        part2 = text[split_idx:].strip()

        rec1 = {
            "id": self._generate_id(part1, 1),
            "text": part1,
            "metadata": record["metadata"],
        }
        rec2 = {
            "id": self._generate_id(part2, 2),
            "text": part2,
            "metadata": record["metadata"],
        }

        return self._recursion(rec1) + self._recursion(rec2)

    def _generate_id(self, text: str, idx: int) -> str:
        """
        Deterministic ID so re-ingesting the same source produces the same ID.
        Includes source_id to avoid collisions across different sources.
        """
        base = f"{text}|{idx}"
        return f"sha1:{sha1_bytes(base.encode('utf-8'))}"