import asyncio
from loguru import logger
from typing import Optional
from src.dtos.request import SearchChatRequest
from src.models.state import FlowResponse
import json
from src.services.crew.callbacks import create_agent_step_callback
from src.services.crew.flow import SearchCrewFlow

from langfuse import observe


class SearchFlowService:
    def _build_search_filter(self, request: SearchChatRequest) -> Optional[dict]:
        """Build search filter dict preferring file_id exclusions with file_path fallback."""
        search_filter = (
            request.filter.model_dump(exclude_none=True) if request.filter else {}
        )

        exclude_file_ids = []
        if isinstance(search_filter.get("exclude_file_ids"), list):
            exclude_file_ids.extend(
                file_id
                for file_id in search_filter["exclude_file_ids"]
                if isinstance(file_id, str) and file_id.strip()
            )
        exclude_file_ids.extend(
            ref.file_id
            for ref in request.exclude
            if getattr(ref, "file_id", None)
        )

        exclude_paths = []
        if isinstance(search_filter.get("exclude"), list):
            exclude_paths.extend(
                file_path
                for file_path in search_filter["exclude"]
                if isinstance(file_path, str) and file_path.strip()
            )
        exclude_paths.extend(ref.file_path for ref in request.exclude if ref.file_path)

        if exclude_file_ids:
            search_filter["exclude_file_ids"] = list(dict.fromkeys(exclude_file_ids))
        else:
            search_filter.pop("exclude_file_ids", None)
        if exclude_paths:
            search_filter["exclude"] = list(dict.fromkeys(exclude_paths))
        else:
            search_filter.pop("exclude", None)
        return search_filter or None

    @observe(name="search_flow", as_type="generation")
    async def execute_workflow(self, request: SearchChatRequest) -> FlowResponse:
        flow = SearchCrewFlow(stream_llm=False)

        inputs = {
            "query": request.query,
            "context": request.context or "",
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
            logger.error(f"❌ Error during flow execution: {e}")
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

        inputs = {
            "query": request.query,
            "context": request.context or "",
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
                        logger.warning(f"⚠️ Could not get full text natively: {e}")

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
                logger.error(f"❌ Async Flow Error: {e}")
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
