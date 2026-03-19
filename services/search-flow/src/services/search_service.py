import asyncio
from typing import List, Optional
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
import json
from src.services.crew.callbacks import create_agent_step_callback
from src.services.crew.flow import SearchCrewFlow
import httpx
from src.config.settings import settings

from langfuse import observe


class SearchFlowService:
    def _build_search_filter(self, request: SearchChatRequest) -> Optional[dict]:
        """Build search filter dict merging request.filter and request.exclude."""
        search_filter = (
            request.filter.model_dump(exclude_none=True) if request.filter else {}
        )
        exclude_paths = [ref.file_path for ref in request.exclude]
        if exclude_paths:
            search_filter["exclude"] = exclude_paths
        return search_filter or None

    @observe(name="search_flow", as_type="generation")
    async def execute_workflow(self, request: SearchChatRequest) -> FlowResponse:
        flow = SearchCrewFlow(stream_llm=False)
        enriched_context_str = await self._enrich_attachments(request.attachments)

        inputs = {
            "query": request.query,
            "context": enriched_context_str,
            "history": request.history,
            "mode": request.mode,
            "metadata": request.metadata,
            "title": request.title,
            "search_filter": self._build_search_filter(request),
        }
        try:
            result = await flow.kickoff_async(inputs=inputs)
            if result and hasattr(result, "pydantic"):
                return result.pydantic
            elif result and hasattr(result, "json_dict"):
                return FlowResponse(**result.json_dict)
            else:
                return FlowResponse(
                    response=str(result), title=request.title or "Summary"
                )
        except Exception as e:
            print(f"❌ Error during flow execution: {e}")
            return FlowResponse(
                response=f"Error executing search flow: {str(e)}", title="Error"
            )

    @observe(name="search_flow_stream", as_type="generation")
    async def execute_workflow_stream(self, request: SearchChatRequest):

        event_queue = asyncio.Queue()

        def report_status(msg):
            event_queue.put_nowait({"type": "status", "content": msg})

        step_callback = create_agent_step_callback(report_status)
        flow = SearchCrewFlow(step_callback=step_callback)

        enriched_context_str = await self._enrich_attachments(request.attachments)

        inputs = {
            "query": request.query,
            "context": enriched_context_str,
            "history": request.history,
            "mode": request.mode,
            "metadata": request.metadata,
            "title": request.title,
            "search_filter": self._build_search_filter(request),
        }

        state = {"buf": "", "in_response": False, "done": False}

        def _handle_token(raw: str):
            if state["done"]:
                return
            state["buf"] += raw
            buf = state["buf"]

            if not state["in_response"]:
                marker = '"response":'
                idx = buf.find(marker)
                if idx != -1:
                    after = buf[idx + len(marker) :].lstrip()
                    if after.startswith('"'):
                        state["in_response"] = True
                        state["buf"] = after[1:]
                return

            output = []
            i = 0
            while i < len(buf):
                c = buf[i]
                if c == "\\" and i + 1 < len(buf):
                    nxt = buf[i + 1]
                    escapes = {
                        "n": "\n",
                        "t": "\t",
                        "r": "\r",
                        '"': '"',
                        "\\": "\\",
                    }
                    output.append(escapes.get(nxt, nxt))
                    i += 2
                elif c == "\\" and i + 1 == len(buf):
                    break
                elif c == '"':
                    state["done"] = True
                    state["buf"] = buf[i + 1 :]
                    break
                else:
                    output.append(c)
                    i += 1

            if not state["done"]:
                state["buf"] = buf[i:]

            text = "".join(output)
            if text:
                event_queue.put_nowait({"type": "token", "content": text})

        async def run_flow_async():
            try:
                # Perform the kickoff without any EventBus listeners
                output = await flow.kickoff_async(inputs=inputs)

                # 1. Native Streaming Iteration (Token Events)
                if hasattr(output, "__aiter__"):
                    async for chunk in output:
                        # Extract the string content from StreamChunk
                        # and send it to our parser to remove JSON artifacts
                        if chunk and hasattr(chunk, "content"):
                            _handle_token(chunk.content)

                # 2. Final Result Event
                final_text = ""
                if hasattr(output, "get_full_text"):
                    try:
                        final_text = output.get_full_text()
                    except Exception as e:
                        print(f"⚠️ Could not get full text natively: {e}")

                if final_text:
                    try:
                        result_data = json.loads(final_text)
                    except json.JSONDecodeError:
                        result_data = {"response": final_text}  # Fallback

                    await event_queue.put(
                        {
                            "type": "result",
                            "content": result_data,
                        }
                    )
                else:
                    await event_queue.put(
                        {"type": "error", "content": "No response generated."}
                    )
            except Exception as e:
                print(f"❌ Async Flow Error: {e}")
                await event_queue.put({"type": "error", "content": str(e)})
            finally:
                # 3. Stream Closure Event
                await event_queue.put(None)

        asyncio.create_task(run_flow_async())

        while True:
            event = await event_queue.get()
            if event is None:
                break
            yield json.dumps(event, ensure_ascii=False) + "\n"

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
