from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from .search import FileRef


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


class FlowResponse(BaseResponse):
    """Response schema for search/lookup/auto modes — includes citations."""
    citations: Optional[List[FileRef]] = Field(
        None,
        description="List of ALL chunks referenced in your response (file_path, page_number, chunk_number). Ensure every piece of information in your response is backed by a citation if possible. Include citations even if they are redundant or translated versions of the same content. Set to null only if no relevant info is found. Constraint: Do NOT answer from 'Attachments' if the user's intent is to use tool to retrieve documents; you MUST trigger the tool. Constraint: Group chunks by file_path and sort by page_number and chunk_number ascending.",
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

    # Tracking state
    tool_results_store: list = Field(default_factory=list)

    # Final Output Storage
    final_response: Optional[FlowResponse] = None
