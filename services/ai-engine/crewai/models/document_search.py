from pydantic import BaseModel, Field
from typing import Optional, List
from typing import Dict, Any
from enum import Enum


# ============================================================================
# Enums
# ============================================================================
class OrchestratorDecision(str, Enum):
    """Decision types for orchestrator agent."""

    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    SEARCH = "SEARCH"
    DIRECT_RESPONSE = "DIRECT_RESPONSE"


class RAGAnalyzerDecision(str, Enum):
    """Decision types for RAG analyzer agent."""

    SKIPPED = "SKIPPED"
    SEARCH_PERFORMED = "SEARCH_PERFORMED"


class ResponseType(str, Enum):
    """Types of responses from chat responder."""

    CLARIFICATION = "CLARIFICATION"
    DIRECT = "DIRECT"
    SEARCH_BASED = "SEARCH_BASED"


# ============================================================================
# Search Schema
# ============================================================================
class SearchOutput(BaseModel):
    """Output schema from Search tool."""

    documents: List[Dict[str, Any]] = Field(
        ..., description="List of documents returned from search"
    )
    query: str = Field(..., description="The search query text that was used")
    total: int = Field(..., description="Total number of documents found")


class SearchInput(BaseModel):
    """Input schema for Search tool."""

    query: str = Field(..., description="Search query text to find relevant documents")


# ============================================================================
# Output Schemas
# ============================================================================


class OrchestratorOutput(BaseModel):
    """Output from orchestrator agent."""

    decision: OrchestratorDecision = Field(
        ...,
        description="Routing decision: NEEDS_CLARIFICATION (ask user), SEARCH (search docs), or DIRECT_RESPONSE (answer directly)",
    )
    reasoning: str = Field(..., description="Explanation of why this decision was made")


class RAGAnalyzerOutput(BaseModel):
    """Output from RAG analyzer agent."""

    decision: RAGAnalyzerDecision = Field(
        ...,
        description="Search decision: SKIPPED (no search needed) or SEARCH_PERFORMED (search executed)",
    )
    reasoning: str = Field(
        ..., description="Explanation of the search decision and strategy used"
    )
    search_attempts: Optional[List[str]] = Field(
        None, description="List of search queries that were attempted"
    )
    search_result: Optional[SearchOutput] = Field(
        None,
        description="Final search results with documents (if search was performed)",
    )
    search_success: Optional[bool] = Field(
        None, description="Whether relevant documents were found (true/false)"
    )


class ChatResponderOutput(BaseModel):
    """Output from chat responder agent."""

    response: str = Field(
        ..., description="The final response message to the user in their language"
    )
    response_type: ResponseType = Field(
        ...,
        description="Type of response: CLARIFICATION (asking questions), DIRECT (general knowledge), or SEARCH_BASED (from documents)",
    )
    sources_used: Optional[List[str]] = Field(
        None,
        description="List of document sources cited in the response (if SEARCH_BASED)",
    )
    language: str = Field(
        ...,
        description="Language code of the response (e.g., 'th' for Thai, 'en' for English)",
    )
