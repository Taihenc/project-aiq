import asyncio
from typing import List, Any
from src.dtos.request import SearchChatRequest
from src.models.state import FlowResponse
from src.models.search import FileRef, FileContent, ChunkMetadata, ChunkContent
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
            "mode": request.mode,
            "metadata": request.metadata,
        }

        try:
            # Flow handles tool loading internally
            # Use async kickoff
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

    # TODO: Temporary method
    async def _enrich_attachments(self, attachments: List[Any]) -> List[FileContent]:
        """
        Converts raw attachments into FileContent objects enriched with text content
        by fetching real text content from the embedding-service.
        """
        base_url = settings.embedding_service_url
        results = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for att in attachments:
                try:
                    # Parse attachment into FileRef
                    if isinstance(att, dict):
                        chunks_data = att.get("chunks", [])
                        chunks = [ChunkMetadata(**c) for c in chunks_data]
                        ref = FileRef(file_path=att.get("file_path", ""), chunks=chunks)
                    elif isinstance(att, FileRef):
                        ref = att
                    else:
                        print(f"⚠️ Invalid attachment type: {type(att)}")
                        continue

                    # Fetch real content and build ChunkContent list
                    enriched_chunks = []
                    for chunk in ref.chunks:
                        try:
                            resp = await client.post(
                                f"{base_url}/v1/chunks",
                                json={
                                    "chunk_id": chunk.chunk_id,
                                    "backward": 0,
                                    "forward": 0,
                                },
                            )
                            resp.raise_for_status()
                            data = resp.json()

                            fetched_chunks = data.get("chunks", [])
                            text = (
                                fetched_chunks[0].get("text", "")
                                if fetched_chunks
                                else ""
                            )
                            if not fetched_chunks:
                                print(
                                    f"⚠️ No content returned for chunk {chunk.chunk_id}"
                                )

                        except Exception as e:
                            print(f"⚠️ Failed to fetch chunk {chunk.chunk_id}: {e}")
                            text = ""

                        enriched_chunks.append(
                            ChunkContent(
                                chunk_id=chunk.chunk_id,
                                page_number=chunk.page_number,
                                score=chunk.score,
                                text=text,
                            )
                        )

                    content = FileContent(
                        file_path=ref.file_path, chunks=enriched_chunks
                    )
                    results.append(content)

                except Exception as e:
                    print(f"⚠️ Failed to parse/enrich attachment: {e}")
                    continue

        return results
