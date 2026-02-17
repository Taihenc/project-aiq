import asyncio
from typing import List, Any
from src.dtos.request import SearchChatRequest
from src.models.state import FlowResponse
from src.models.search import ChunkContent, PageContent, SearchContent
from src.services.crew.flow import SearchCrewFlow
import httpx
from src.config.settings import settings

from langfuse import observe
from src.services.crew.tools.factory import MCPToolFactory


class SearchFlowService:
    @observe(name="search_flow", as_type="generation")
    async def execute_workflow(self, request: SearchChatRequest) -> FlowResponse:
        # 2. Initialize Flow with Tools
        flow = SearchCrewFlow()

        enriched_attachments = await self._enrich_attachments(request.attachments)

        context_dicts = [item.model_dump() for item in enriched_attachments]
        inputs = {
            "query": request.query,
            "context": context_dicts,
            "history": request.history,
        }

        try:
            await flow.kickoff_async(inputs=inputs)
        except Exception as e:
            print(f"❌ Error during flow execution: {e}")
            return FlowResponse(
                action="reject", response=f"Error executing search flow: {str(e)}"
            )

        if flow.state.final_response:
            return flow.state.final_response

        return FlowResponse(
            action="reject", response="Error: No response generated from the flow."
        )

    # TODO: Temporary until we have a better way to handle this
    async def _enrich_attachments(self, attachments: List[Any]) -> List[Any]:
        """
        Converts Ref objects (ChunkRef, PageRef, SearchRef) into Content objects
        (ChunkContent, PageContent, SearchContent) by retrieving/simulating content.
        """

        enriched = []
        async with httpx.AsyncClient(
            base_url=settings.embedding_service_url, timeout=30.0
        ) as client:
            for item in attachments:
                try:
                    if item.type == "chunk":
                        # Fetch chunk content
                        response = await client.post(
                            "/chunks",
                            json={
                                "chunk_id": item.chunk_id,
                                "backward": 0,
                                "forward": 0,
                            },
                        )
                        response.raise_for_status()
                        data = response.json()
                        text = (
                            data["chunks"][0]["text"]
                            if data.get("chunks")
                            else "[Chunk Content Not Found]"
                        )

                        enriched.append(
                            ChunkContent(
                                **item.model_dump(),
                                content=text,
                            )
                        )
                    elif item.type == "page":
                        # Fetch page content
                        response = await client.post(
                            "/pages",
                            json={
                                "file_path": item.file_path,
                                "start_page": item.page_number,
                                "end_page": item.page_number,
                            },
                        )
                        # Page endpoint might return 200 with empty list or whatever.
                        # It returns PageRetrievalResponse(pages=[...])
                        response.raise_for_status()
                        data = response.json()
                        if data.get("pages") and len(data["pages"]) > 0:
                            text = data["pages"][0]["text"]
                        else:
                            text = "[Page Content Not Found]"

                        enriched.append(
                            PageContent(
                                **item.model_dump(),
                                content=text,
                            )
                        )
                    elif item.type == "search":
                        # Fetch search content (treated as chunk)
                        response = await client.post(
                            "/chunks",
                            json={
                                "chunk_id": item.chunk_id,
                                "backward": 0,
                                "forward": 0,
                            },
                        )
                        response.raise_for_status()
                        data = response.json()
                        text = (
                            data["chunks"][0]["text"]
                            if data.get("chunks")
                            else "[Search Result Content Not Found]"
                        )

                        enriched.append(
                            SearchContent(
                                **item.model_dump(),
                                content=text,
                            )
                        )
                    else:
                        # Fallback for unknown types
                        enriched.append(item)
                except Exception as e:
                    print(f"⚠️ Failed to enrich attachment {item}: {e}")
                    # Include it anyway with error message or fallback
                    # Create a dummy Content object with error text to inform LLM
                    error_text = f"[Error retrieving content: {str(e)}]"
                    if item.type == "chunk":
                        enriched.append(
                            ChunkContent(**item.model_dump(), content=error_text)
                        )
                    elif item.type == "page":
                        enriched.append(
                            PageContent(**item.model_dump(), content=error_text)
                        )
                    elif item.type == "search":
                        enriched.append(
                            SearchContent(**item.model_dump(), content=error_text)
                        )
                    else:
                        enriched.append(item)

        return enriched
