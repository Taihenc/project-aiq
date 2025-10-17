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
    SEARCH_REQUIRED = "SEARCH_REQUIRED"
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

    documents: List[Dict[str, Any]] = Field(..., description="List of documents")
    query: str = Field(..., description="Search query text")
    total: int = Field(..., description="Total number of documents")


class SearchInput(BaseModel):
    """Input schema for Search tool."""

    query: str = Field(..., description="Search query text to find relevant documents")
    top_k: int = Field(
        default=10, description="Number of results from embedding search"
    )
    top_n: int = Field(default=5, description="Number of final results after reranking")


# ============================================================================
# Output Schemas
# ============================================================================


class OrchestratorOutput(BaseModel):
    """Output from orchestrator agent."""

    decision: OrchestratorDecision
    reasoning: str
    validated_query: Optional[str] = None
    clarification_questions: Optional[List[str]] = None
    final_response: Optional[str] = None


class RAGAnalyzerOutput(BaseModel):
    """Output from RAG analyzer agent."""

    decision: RAGAnalyzerDecision
    reasoning: str
    search_attempts: Optional[List[str]] = None
    search_result: Optional[SearchOutput] = None
    search_success: Optional[bool] = None


class ChatResponderOutput(BaseModel):
    """Output from chat responder agent."""

    response: str
    response_type: ResponseType
    sources_used: Optional[List[str]] = None
    language: str
