import json
from typing import Dict, List, Any, Optional, Type

import httpx
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
import pprint
from app.config.settings import settings


class SearchResult(BaseModel):
    """Individual search result with text and metadata"""

    id: str = Field(description="The unique document identifier")
    text: str = Field(description="The document text content")
    metadata: Dict[str, Any] = Field(description="Document metadata including path")
    score: float = Field(description="The relevance score of the search result")


class AIQSearchOutput(BaseModel):
    """Search output containing list of results"""

    results: List[SearchResult] = Field(description="List of search results")
    error: Optional[str] = Field(
        default=None, description="Error message if search failed"
    )


class AIQSearchToolSchema(BaseModel):
    """Schema for AIQSearchTool parameters - Agent only specifies query and path"""

    query: str = Field(
        description="The search query as a plain text string (e.g., 'AIQ positive reviews')"
    )
    path: Optional[str] = Field(
        default=None,
        description="Optional search path/collection to query (e.g., 'documents/reviews')",
    )


class AIQSearchTool(BaseTool):
    name: str = "aiq_search_tool"
    description: str = (
        "Search the AIQ knowledge base for relevant documents. "
        "Provide a clear search query as text. "
        "Example usage: query='AIQ product features', path='documents'"
    )
    result_as_answer: bool = True
    args_schema: Type[BaseModel] = AIQSearchToolSchema
    SEARCH_ENDPOINT: str = "/v1/search"

    def _run(
        self,
        query: str,
        path: Optional[str] = None,
    ) -> AIQSearchOutput:
        """Search the embedding service knowledge base.

        Args:
            query: Search query text from the agent
            path: The search path/collection to query

        Returns:
            Formatted string of search results for the agent
        """
        # Use settings defaults for all parameters
        top_k = settings.TOP_K
        top_n = settings.RERANK_TOP_N
        score_threshold = settings.SCORE_THRESHOLD

        try:
            # Construct the full API URL
            url = f"{settings.EMBEDDING_SERVICE_URL}{self.SEARCH_ENDPOINT}"

            # Prepare request payload
            payload = {
                "query": query,
                "top_k": top_k,
                "top_n": top_n,
                "score_threshold": score_threshold,
                "filter": {"path": path},
            }

            # Make HTTP POST request to embedding service
            with httpx.Client(timeout=settings.TIMEOUT) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()

            # Parse response
            data = response.json()

            # Transform documents to SearchResult format
            results = [
                SearchResult(
                    id=doc["id"],
                    text=doc["text"],
                    metadata=doc["metadata"],
                    score=doc["score"],
                )
                for doc in data.get("documents", [])
            ]

            return AIQSearchOutput(results=results)

        except httpx.HTTPError as e:
            return AIQSearchOutput(
                results=[], error=f"Unable to connect to embedding service"
            )
        except Exception as e:
            return AIQSearchOutput(results=[], error=f"An error occurred during search")
