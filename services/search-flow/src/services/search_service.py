import asyncio
from typing import List, Any
from src.dtos.request import SearchChatRequest
from src.models.state import FlowResponse
from src.models.search import FileRef, FileContent, ChunkMetadata
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
        Converts FileRef objects (from input) into FileContent objects (with text).
        Simulates content retrieval for now as requested ("Content map later").
        """
        results = []
        for att in attachments:
            try:
                # att is expected to be a dict (from API) or FileRef
                if isinstance(att, dict):
                    # Basic validation or conversion
                    # Assuming dict structure matches FileRef
                    chunks_data = att.get("chunks", [])
                    chunks = [ChunkMetadata(**c) for c in chunks_data]
                    ref = FileRef(file_path=att.get("file_path", ""), chunks=chunks)
                elif isinstance(att, FileRef):
                    ref = att
                else:
                    print(f"⚠️ Invalid attachment type: {type(att)}")
                    continue

                # Create FileContent
                # For now, we init with empty content map or simulated one
                content = FileContent(
                    file_path=ref.file_path, chunks=ref.chunks, chunk_contents={}
                )

                # Simulate/Placeholder for chunk content
                # In real scenario: fetch from embedding-service using chunk_id
                for chunk in ref.chunks:
                    # Simulation:
                    content.chunk_contents[chunk.chunk_id] = (
                        f"Content for chunk {chunk.chunk_id} (Page {chunk.page_number}) "
                        f"from {ref.file_path}. [SCORE: {chunk.score}]"
                    )

                results.append(content)

            except Exception as e:
                print(f"⚠️ Failed to parse/enrich attachment: {e}")
                continue

        return results
