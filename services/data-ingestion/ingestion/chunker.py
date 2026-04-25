import sys, os
from loguru import logger
from typing import List, Dict, Any
from docling.chunking import HybridChunker
from docling_core.types.doc import DoclingDocument
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from transformers import AutoTokenizer

# Path configuration
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

class Chunker:
    def __init__(self):
        self.max_tokens = settings.max_chunk_size
        self.EMBED_MODEL_ID = os.environ.get("EMBED_MODEL_ID", "BAAI/bge-m3")
        try:
            tokenizer = AutoTokenizer.from_pretrained(self.EMBED_MODEL_ID)
        except Exception as e:
            logger.debug(f"AutoTokenizer failed: {e}. Trying fallback to BAAI/bge-m3")
            tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-m3")
        self.tokenizer = HuggingFaceTokenizer(
            tokenizer=tokenizer,
            max_tokens=self.max_tokens,
        )
        self.chunker = HybridChunker(
            tokenizer=self.tokenizer,
            merge_peers=True
        )

    def chunk(self, doc: DoclingDocument) -> List[Dict[str, Any]]:
        """
        Chunks a Docling document using native contextualized text serialization.
        """
        chunks_iter = self.chunker.chunk(doc)
        serialized_chunks = []

        for chunk in chunks_iter:
            # 1. Use Docling's native contextualization
            # This prepends headings/context and converts the chunk to a string
            contextualized_text = self.chunker.contextualize(chunk)
            
            # 2. Extract page numbers from provenance
            pages = set()
            for item in chunk.meta.doc_items:
                for prov in item.prov:
                    if hasattr(prov, "page_no"):
                        pages.add(prov.page_no)

            chunk_output = {
                "text": contextualized_text,  # Context-enriched text for embedding
                # "raw_text": self.chunker.serialize(chunk), # Clean text without context
                "page_nos": sorted(list(pages)),
                "token_cnt": self.tokenizer.count_tokens(contextualized_text),
                "metadata": {
                    "headings": chunk.meta.headings,
                    "doc_items": [item.model_dump() for item in chunk.meta.doc_items],
                }
            }
            
            serialized_chunks.append(chunk_output)

        return serialized_chunks