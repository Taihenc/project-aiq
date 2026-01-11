import sys , os
from typing import List, Dict, Any
from docling.chunking import HybridChunker
from docling_core.types.doc import DoclingDocument
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings
from transformers import AutoTokenizer
class Chunker:
    def __init__(self):
        # Pull configuration from settings
        self.max_tokens = settings.max_chunk_size
        self.EMBED_MODEL_ID = "BAAI/bge-m3"
        self.tokenizer = HuggingFaceTokenizer(
            tokenizer=AutoTokenizer.from_pretrained(self.EMBED_MODEL_ID),
            max_tokens=self.max_tokens,  # optional, by default derived from `tokenizer` for HF case
        )
        # Initialize Docling's layout-aware chunker
        self.chunker = HybridChunker(
            tokenizer=self.tokenizer,
            merge_peers=True
        )
    def chunk(self, doc: DoclingDocument) -> List[Dict[str, Any]]:
        """
        Chunks a Docling document and returns a list of dictionaries
        containing the text and all associated metadata.
        """
        # Generate chunks from the Docling document
        chunks_iter = self.chunker.chunk(doc)
        serialized_chunks = []

        for chunk in chunks_iter:
            # Convert the docling chunk (Pydantic model) to a dictionary
            chunk_dict = chunk.model_dump()
            meta = chunk_dict.get("meta", {})
            
            # Extract page numbers by scanning the doc_items
            pages = set()
            doc_items = meta.get("doc_items", [])
            for item in doc_items:
                if "prov" in item:
                    for p in item["prov"]:
                        if "page_no" in p:
                            pages.add(p["page_no"])
            # Construct the flat dictionary output
            chunk_output = {
                "text": chunk.text,
                "page_nos": sorted(list(pages)),
                "token_cnt": self.tokenizer.count_tokens(chunk.text),
                "metadata": {
                    "doc_items": doc_items,  # Keeping all original doc_items metadata
                }
            }
            
            serialized_chunks.append(chunk_output)

        return serialized_chunks