from crewai.tools import BaseTool
from src.core.domain.model.search import VectorResultItem, VectorSearchOutput
from .mock_data import MOCK_CHUNKS


class VectorSearchTool(BaseTool):
    name: str = "VectorSearchTool"
    description: str = (
        "Useful for Global Document Search. Use this to find specific information, facts, or keywords in the documents. "
        "Returns content snippets with chunk_ids. If the snippet is incomplete, you may need to use ChunkLookupTool next."
    )

    def _run(self, query: str) -> str:
        results = []
        q_lower = query.lower()
        for cid, data in MOCK_CHUNKS.items():
            if (
                q_lower in data["text"].lower()
                or "zorath" in q_lower
                or "ไวรัส" in q_lower
            ):
                results.append(
                    VectorResultItem(
                        id=cid,
                        score=0.95,  # Mock score
                        text=data["text"],
                        metadata={"file": data["file"], "page": data["page"]},
                    )
                )

        # Limit to top 3
        results = results[:3]
        status = "found" if results else "not_found"
        output = VectorSearchOutput(status=status, results=results)
        return output.model_dump_json()
