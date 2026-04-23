import asyncio
import json
from dataclasses import dataclass
from typing import Optional

from json_repair import repair_json
from loguru import logger
from pydantic import ValidationError

from langfuse import observe

from src.dtos.request import SearchChatRequest
from src.models.state import AISearchResponse, SearchResponse
from src.services.crew.callbacks import AgentStepCallback
from src.services.crew.flow import SearchCrewFlow


# ── Stream token parsing state ──────────────────────────────────────


@dataclass
class _TokenParseState:
    """Tracks incremental JSON token parsing state for the 'response' field."""

    buf: str = ""
    in_response: bool = False
    done: bool = False


_ESCAPE_MAP = {
    "n": "\n",
    "t": "\t",
    "r": "\r",
    '"': '"',
    "\\": "\\",
}


# ── JSON repair helpers ─────────────────────────────────────────────


def _repair_and_parse(raw: str) -> dict:
    """
    Parse a JSON string from LLM output, repairing it if malformed.
    Always returns a dict — falls back to {"response": raw} if repair fails.
    """
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        repaired = repair_json(raw)
        logger.warning(
            f"[json_repair] Repaired malformed JSON (original len={len(raw)})"
        )
        try:
            return json.loads(repaired)
        except Exception:
            logger.error(
                "[json_repair] Could not parse even after repair — using raw fallback"
            )
            return {"response": raw}


def _try_recover_from_raw(raw: str) -> dict | None:
    """
    Attempt to repair malformed LLM output and validate it as a SearchResponse-compatible dict.
    Returns a dict with at least 'response' and 'title' keys, or None if recovery fails.
    """
    try:
        data = _repair_and_parse(raw)
        if isinstance(data, dict) and "response" in data:
            if "title" not in data:
                data["title"] = "Response"
            return data
    except Exception as e:
        logger.error(f"[json_repair] Recovery failed: {e}")
    return None


def _parse_raw_to_flow_response(raw: str, title: str | None) -> SearchResponse:
    """
    Convert a raw LLM string output into a SearchResponse,
    using json_repair to handle malformed JSON.
    """
    data = _repair_and_parse(raw)
    if isinstance(data, dict) and "response" in data:
        try:
            # Only pass fields that belong to SearchResponse (exclude AI-only fields like selected_indices)
            valid_fields = {
                k: v for k, v in data.items() if k in SearchResponse.model_fields
            }
            return SearchResponse(**valid_fields)
        except Exception:
            pass
    return SearchResponse(
        response=data.get("response", raw) if isinstance(data, dict) else raw,
        title=data.get("title", title or "Summary")
        if isinstance(data, dict)
        else title or "Summary",
    )


# ── Service ─────────────────────────────────────────────────────────


class SearchFlowService:
    # ── Input building ──────────────────────────────────────────────

    def _build_search_filter(self, request: SearchChatRequest) -> Optional[dict]:
        """Build search filter dict preferring file_id exclusions with file_path fallback."""
        filter_in = request.filter.model_dump(exclude_none=True, exclude={'exclude_file_ids', 'exclude'}) if request.filter else {}

        exclude_file_ids = []
        if request.filter and request.filter.exclude_file_ids:
            exclude_file_ids.extend(
                file_id for file_id in request.filter.exclude_file_ids if file_id.strip()
            )
        exclude_file_ids.extend(
            ref.file_id for ref in request.exclude if getattr(ref, "file_id", None)
        )

        exclude_paths = []
        if request.filter and request.filter.exclude:
            exclude_paths.extend(
                file_path for file_path in request.filter.exclude if file_path.strip()
            )
        exclude_paths.extend(ref.file_path for ref in request.exclude if ref.file_path)

        filter_out = {}
        if exclude_file_ids:
            filter_out["exclude_file_ids"] = list(dict.fromkeys(exclude_file_ids))
        if exclude_paths:
            filter_out["exclude"] = list(dict.fromkeys(exclude_paths))

        result = {}
        if filter_in:
            result["filter_in"] = filter_in
        if filter_out:
            result["filter_out"] = filter_out

        return result if result else None

    def _build_flow_inputs(self, request: SearchChatRequest) -> dict:
        """Build the inputs dict shared by both sync and streaming execution."""
        return {
            "query": request.query,
            "context": request.context,
            "history": request.history,
            "mode": request.mode,
            "metadata": request.metadata,
            "title": request.title,
            "search_filter": self._build_search_filter(request),
        }

    # ── Sync execution ──────────────────────────────────────────────

    @observe(name="search_flow", as_type="generation")
    async def execute_workflow(self, request: SearchChatRequest) -> SearchResponse:
        flow = SearchCrewFlow(stream_llm=False)
        inputs = self._build_flow_inputs(request)

        try:
            result = await flow.kickoff_async(inputs=inputs)
            logger.info(f"Flow result: {result}")

            # Flow post-processing already returns a SearchResponse directly
            if isinstance(result, SearchResponse):
                return result
            # Fallback: CrewOutput with pydantic model attached
            elif (
                result
                and hasattr(result, "pydantic")
                and isinstance(result.pydantic, SearchResponse)
            ):
                return result.pydantic
            elif result and hasattr(result, "json_dict") and result.json_dict:
                return SearchResponse(
                    **{
                        k: v
                        for k, v in result.json_dict.items()
                        if k in SearchResponse.model_fields
                    }
                )
            else:
                # Last resort: try to repair and parse the raw string output
                raw = str(result)
                return _parse_raw_to_flow_response(raw, request.title)
        except Exception as e:
            logger.error(f"Error during flow execution: {e}")
            return SearchResponse(
                response=f"Error executing search flow: {str(e)}", title="Error"
            )

    # ── Streaming execution ─────────────────────────────────────────

    @observe(name="search_flow_stream", as_type="generation")
    async def execute_workflow_stream(self, request: SearchChatRequest):
        event_queue: asyncio.Queue = asyncio.Queue()

        def report_status(msg):
            event_queue.put_nowait({"type": "status", "content": msg})

        step_callback = AgentStepCallback(report_status)
        flow = SearchCrewFlow(step_callback=step_callback)
        inputs = self._build_flow_inputs(request)

        parse_state = _TokenParseState()

        asyncio.create_task(
            self._run_flow_and_emit(flow, inputs, event_queue, parse_state)
        )

        async for event_json in self._yield_events(event_queue):
            yield event_json

    # ── Stream internals ────────────────────────────────────────────

    @staticmethod
    def _parse_stream_token(raw: str, state: _TokenParseState, queue: asyncio.Queue):
        """
        Incrementally parse JSON-encoded 'response' field tokens from a stream,
        decoding escape sequences and emitting clean text chunks to the queue.
        """
        if state.done:
            return

        state.buf += raw
        buf = state.buf

        # Phase 1: scan for the opening of "response": "..."
        if not state.in_response:
            marker = '"response":'
            idx = buf.find(marker)
            if idx != -1:
                after = buf[idx + len(marker) :].lstrip()
                if after.startswith('"'):
                    state.in_response = True
                    state.buf = after[1:]
            return

        # Phase 2: decode escape sequences and emit text
        output = []
        i = 0
        while i < len(buf):
            c = buf[i]
            if c == "\\" and i + 1 < len(buf):
                nxt = buf[i + 1]
                output.append(_ESCAPE_MAP.get(nxt, nxt))
                i += 2
            elif c == "\\" and i + 1 == len(buf):
                break  # incomplete escape — wait for more data
            elif c == '"':
                state.done = True
                state.buf = buf[i + 1 :]
                break
            else:
                output.append(c)
                i += 1

        if not state.done:
            state.buf = buf[i:]

        text = "".join(output)
        if text:
            queue.put_nowait({"type": "token", "content": text})

    async def _run_flow_and_emit(
        self,
        flow: SearchCrewFlow,
        inputs: dict,
        queue: asyncio.Queue,
        parse_state: _TokenParseState,
    ):
        """Execute the flow asynchronously and push events (tokens, result, error) to the queue."""
        try:
            output = await flow.kickoff_async(inputs=inputs)

            # 1. Native Streaming Iteration (Token Events)
            if hasattr(output, "__aiter__"):
                async for chunk in output:
                    if chunk and hasattr(chunk, "content"):
                        self._parse_stream_token(chunk.content, parse_state, queue)

            # 2. Final Result Event
            # Priority: use SearchResponse from flow post-processing (resolved citations, no selected_indices)
            logger.debug(
                f"[SERVICE] flow output type={type(output).__name__} | "
                f"is_SearchResponse={isinstance(output, SearchResponse)} | "
                f"has_pydantic={hasattr(output, 'pydantic')} | "
                f"pydantic_type={type(getattr(output, 'pydantic', None)).__name__}"
            )
            if isinstance(output, SearchResponse):
                result_data = output.model_dump()
                logger.info(
                    f"Final Result Data: {json.dumps(result_data, ensure_ascii=False, indent=2)}"
                )
                await queue.put({"type": "result", "content": result_data})
            elif hasattr(output, "pydantic") and isinstance(
                output.pydantic, SearchResponse
            ):
                result_data = output.pydantic.model_dump()
                logger.info(
                    f"Final Result Data: {json.dumps(result_data, ensure_ascii=False, indent=2)}"
                )
                await queue.put({"type": "result", "content": result_data})
            else:
                # Streaming mode: CrewStreamingOutput — pydantic not available yet
                # Use get_full_text() to get the raw AI output, then do citation resolution here
                final_text = ""
                if hasattr(output, "get_full_text"):
                    try:
                        final_text = output.get_full_text()
                    except Exception as e:
                        logger.warning(f"Could not get full text natively: {e}")

                if final_text:
                    logger.info(f"Final Result Data (raw): {final_text}")
                    raw_data = _repair_and_parse(final_text)

                    if isinstance(raw_data, dict) and "selected_indices" in raw_data:
                        # Parse as AISearchResponse and resolve citations via flow state
                        try:
                            ai_response = AISearchResponse(
                                title=raw_data.get("title", ""),
                                response=raw_data.get("response", ""),
                                selected_indices=raw_data.get("selected_indices"),
                            )
                            citations = flow._resolve_citations(ai_response)
                            final_response = SearchResponse(
                                title=ai_response.title,
                                response=ai_response.response,
                                citations=citations,
                            )
                            result_data = final_response.model_dump()
                            logger.info(
                                f"Final Result Data (resolved): "
                                f"{json.dumps(result_data, ensure_ascii=False, indent=2)}"
                            )
                            await queue.put({"type": "result", "content": result_data})
                        except Exception as e:
                            logger.error(f"[SERVICE] Citation resolution failed: {e}")
                            # Fallback: send without citations, filter AI-only fields
                            result_data = {
                                k: v
                                for k, v in raw_data.items()
                                if k in SearchResponse.model_fields
                            }
                            await queue.put({"type": "result", "content": result_data})
                    elif isinstance(raw_data, dict):
                        # No selected_indices (e.g. chat mode via raw fallback) — filter fields
                        result_data = {
                            k: v
                            for k, v in raw_data.items()
                            if k in SearchResponse.model_fields
                        }
                        await queue.put({"type": "result", "content": result_data})
                    else:
                        await queue.put({"type": "result", "content": raw_data})
                else:
                    await queue.put(
                        {"type": "error", "content": "No response generated."}
                    )

        except Exception as e:
            logger.error(f"Async Flow Error: {e}")
            await self._emit_error(e, queue)

        finally:
            await queue.put(None)  # sentinel to close stream

    @staticmethod
    async def _emit_error(error: Exception, queue: asyncio.Queue):
        """Extract useful info from errors (especially Pydantic ValidationError) and push to queue."""
        if isinstance(error, ValidationError):
            for err in error.errors():
                raw_input = err.get("input")
                if raw_input:
                    logger.error(
                        f"=== [Debug] FULL AI RAW OUTPUT ===\n{raw_input}\n"
                        f"=================================="
                    )
                    # Attempt to repair and recover a valid response before giving up
                    recovered = _try_recover_from_raw(str(raw_input))
                    if recovered:
                        logger.info(
                            "[json_repair] Successfully recovered response from malformed output"
                        )
                        await queue.put({"type": "result", "content": recovered})
                    else:
                        await queue.put(
                            {
                                "type": "error",
                                "content": "Validation Error. Could not parse AI output.",
                            }
                        )
                    return
        await queue.put({"type": "error", "content": str(error)})

    @staticmethod
    async def _yield_events(queue: asyncio.Queue):
        while True:
            event = await queue.get()
            if event is None:
                logger.debug("[SSE] Stream closed (None event received)")
                break
            yield json.dumps(event, ensure_ascii=False) + "\n"
            if event.get("type") == "token":
                await asyncio.sleep(0.01)
