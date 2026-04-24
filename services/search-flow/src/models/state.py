from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from .search import FileRef, ChunkMetadata


# ── Shared base ──────────────────────────────────────────────────────


class BaseResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(
        ...,
        description="A short, descriptive title for this conversation based on the query. If a title is already provided in the context, reuse it.",
    )
    response: str = Field(
        ...,
        description="The text response relevant to the query. Create a well-structured Markdown response. Use headers (e.g., ##), bullet points, and bold text to organize information clearly.",
    )


# ── Concrete response types ─────────────────────────────────────────


class ChatResponse(BaseResponse):
    """Response schema for chat mode — no citations."""

    pass


class AISearchResponse(BaseResponse):
    """Response schema that the AI fills — uses index selection instead of raw citations."""

    selected_indices: Optional[List[int]] = Field(
        None,
        description=(
            "List of result indices (the numbers shown in brackets like [0], [1], [2], etc.) "
            "that you referenced or used in your response. Include ALL indices of results you actually used. "
            "Set to null only if no relevant info was found. "
            "Constraint: Do NOT answer from 'Attachments' if the user's intent is to search; you MUST trigger the tool first."
        ),
    )


class SearchResponse(BaseResponse):
    """Final response schema returned to the frontend — includes resolved citations."""

    citations: Optional[List[FileRef]] = Field(
        None,
        description="Resolved citations mapped from AI-selected indices.",
    )


class HyDEResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(
        ...,
        description="A short, descriptive title for the hypothetical document snippet.",
    )
    query: str = Field(
        ...,
        description="The generated hypothetical document snippet answering the original query. Must contain a concise, factual, and direct informational text block (no introductions or conversational filler).",
    )


class FlowState(BaseModel):
    # Inputs
    query: str = ""
    context: str = ""
    history: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    mode: str = Field(default="auto")
    title: Optional[str] = None
    search_filter: Optional[dict] = None

    # Tracking state — stores raw document dicts from search tool for index-based resolution
    tool_results_store: List[Dict[str, Any]] = Field(default_factory=list)

    # Final Output Storage
    final_response: Optional[SearchResponse] = None
