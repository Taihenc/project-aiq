from crewai.tools import BaseTool
from src.models.search import PageLookupOutput
from .mock_data import MOCK_CHUNKS


class PageLookupTool(BaseTool):
    name: str = "PageLookupTool"
    description: str = (
        "Navigate to and read a specific page number of a file. "
        "Use this ONLY when the user explicitly specifies a file and page number (e.g. 'Read page 10 of report')."
    )

    def _run(self, file: str, page: int) -> str:
        try:
            target_page = int(page)
        except ValueError:
            return PageLookupOutput(
                status="error", file=file, page=-1, content="Invalid page number format"
            ).model_dump_json()

        content = [
            d["text"]
            for d in MOCK_CHUNKS.values()
            if d.get("file") == file and d.get("page") == target_page
        ]
        if not content:
            return PageLookupOutput(
                status="error", file=file, page=target_page, content="Page not found"
            ).model_dump_json()

        output = PageLookupOutput(
            status="success", file=file, page=target_page, content="".join(content)
        )
        return output.model_dump_json()
