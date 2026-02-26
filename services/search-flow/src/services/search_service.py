import asyncio
from typing import List
from src.dtos.request import SearchChatRequest
from src.models.state import FlowResponse
from src.models.search import FileRef, ChunkMetadata
from src.dtos.embedding import (
    EmbeddingChunk,
    EmbeddingPage,
    EmbeddingFile,
    FileReferenceRequest,
    FileReferenceResponse,
)
from src.services.crew.flow import SearchCrewFlow
import httpx
from src.config.settings import settings

from langfuse import observe


class SearchFlowService:
    @observe(name="search_flow", as_type="generation")
    async def execute_workflow(self, request: SearchChatRequest) -> FlowResponse:
        # ... (stays same as before but uses execute_workflow_stream internally or just remains as is)
        # For simplicity, keeping existing method but adding stream below
        flow = SearchCrewFlow()
        enriched_context_str = await self._enrich_attachments(request.attachments)

        inputs = {
            "query": request.query,
            "context": enriched_context_str,
            "history": request.history,
            "mode": request.mode,
            "metadata": request.metadata,
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

    @observe(name="search_flow_stream", as_type="generation")
    async def execute_workflow_stream(self, request: SearchChatRequest):
        import asyncio
        import json
        from src.services.crew.callbacks import create_agent_step_callback

        event_queue = asyncio.Queue()

        def report_status(msg):
            event_queue.put_nowait({"type": "status", "content": msg})

        step_callback = create_agent_step_callback(report_status)
        flow = SearchCrewFlow(step_callback=step_callback)
        enriched_context_str = await self._enrich_attachments(request.attachments)

        flow.state.query = request.query
        flow.state.context = enriched_context_str
        flow.state.history = request.history
        flow.state.mode = request.mode
        flow.state.metadata = request.metadata

        async def run_flow():
            try:
                await flow.kickoff_async()

                if flow.state.final_response:
                    await event_queue.put({
                        "type": "result",
                        "content": flow.state.final_response.model_dump()
                    })
                else:
                    await event_queue.put({
                        "type": "error",
                        "content": "Flow finished but no final response was generated."
                    })

            except Exception as e:
                print(f"❌ Async Flow Error: {e}")
                await event_queue.put({"type": "error", "content": str(e)})
            finally:
                await event_queue.put(None)

        asyncio.create_task(run_flow())

        while True:
            event = await event_queue.get()
            if event is None:
                break
            yield json.dumps(event) + "\n"

    async def _enrich_attachments(self, attachments: List[FileRef]) -> str:
        """
        Converts raw attachments into FileContent objects enriched with text content
        by fetching real text content from the embedding-service.
        """
        # 1. Transform attachments to EmbeddingFile structure
        embedding_files = []

        for att in attachments:
            try:
                # Parse to FileRef (same as before)
                if isinstance(att, dict):
                    chunks_data = att.get("chunks", [])
                    chunks = [ChunkMetadata(**c) for c in chunks_data]
                    ref = FileRef(file_path=att.get("file_path", ""), chunks=chunks)
                elif isinstance(att, FileRef):
                    ref = att
                else:
                    print(f"⚠️ Invalid attachment type: {type(att)}")
                    continue

                # Group chunks by page
                pages_map = {}
                for chunk in ref.chunks:
                    if chunk.page_number not in pages_map:
                        pages_map[chunk.page_number] = []

                    pages_map[chunk.page_number].append(
                        EmbeddingChunk(
                            chunk_number=chunk.chunk_number, score=chunk.score
                        )
                    )

                # Create EmbeddingPage objects
                embedding_pages = []
                for page_num, page_chunks in pages_map.items():
                    embedding_pages.append(
                        EmbeddingPage(page_number=page_num, chunks=page_chunks)
                    )

                # Create EmbeddingFile object
                embedding_files.append(
                    EmbeddingFile(file_path=ref.file_path, pages=embedding_pages)
                )

            except Exception as e:
                print(f"⚠️ Failed to parse attachment for enriching: {e}")
                continue

        if not embedding_files:
            return ""

        # 2. Call Embedding Service
        base_url = settings.embedding_service_url
        try:
            # Prepare request payload directly from pydantic models
            payload = FileReferenceRequest(files=embedding_files).model_dump()

            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/text-by-file-reference", json=payload
                )
                resp.raise_for_status()
                data = resp.json()

                # Parse response
                result = FileReferenceResponse(**data)
                return result.result

        except Exception as e:
            print(f"❌ Failed to enrich attachments via embedding-service: {e}")
            return ""
