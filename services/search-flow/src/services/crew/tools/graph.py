from crewai.tools import BaseTool
from src.models.search import GraphSearchOutput, GraphRelation


class GraphTool(BaseTool):
    name: str = "GraphTool"
    description: str = (
        "Find relationships or overview of entities. "
        "Use this for broad questions about connections between topics or to get a structural overview."
    )

    def _run(self, query: str) -> str:
        # Simple mock
        rels = [
            GraphRelation(
                source="Zorath-9", target="Mariana Trench", relation="Discovered at"
            )
        ]
        output = GraphSearchOutput(status="success", relationships=rels)
        return output.model_dump_json()
