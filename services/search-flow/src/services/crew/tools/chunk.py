from crewai.tools import BaseTool
from src.models.search import ChunkLookupOutput
from .mock_data import MOCK_CHUNKS


class ChunkLookupTool(BaseTool):
    name: str = "ChunkLookupTool"
    description: str = (
        "Fetch full content of a specific chunk by its ID. "
        "Use this ONLY when you have a valid chunk_id from a previous search result and need more context."
    )

    def _run(self, chunk_id: str) -> str:
        chunk = MOCK_CHUNKS.get(chunk_id)
        if not chunk:
            return ChunkLookupOutput(
                status="error", chunk_id=chunk_id, content="Chunk not found"
            ).model_dump_json()

        output = ChunkLookupOutput(
            status="success",
            chunk_id=chunk_id,
            content=chunk["text"],
            metadata={"file": chunk["file"], "page": chunk["page"]},
            next_chunk=chunk.get("next"),
        )
        return output.model_dump_json()
