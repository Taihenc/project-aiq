import httpx
import os
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager


class EmbeddingClient:
    """
    HTTP client for communicating with the embedding-service.
    Handles uploading chunked documents for vectorization and storage.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 30.0,
        batch_size: int = 32,
    ):
        """
        Args:
            base_url: Base URL of the embedding-service (defaults to env var or localhost)
            timeout: HTTP request timeout in seconds
            batch_size: Number of documents to send per request
        """
        self.base_url = base_url or os.environ.get(
            "EMBEDDING_SERVICE_URL", "http://localhost:8001"
        )
        self.timeout = timeout
        self.batch_size = batch_size
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        """Async context manager entry."""
        self._client = httpx.AsyncClient(timeout=self.timeout)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()

    @staticmethod
    @asynccontextmanager
    async def create():
        """Factory method for async context manager usage."""
        client = EmbeddingClient()
        async with client as c:
            yield c

    async def upload_documents(
        self,
        documents: List[Dict[str, Any]],
        use_batches: bool = True,
    ) -> List[str]:
        """
        Upload documents (chunks) to the embedding-service for processing.

        Args:
            documents: List of dicts with 'text' and 'metadata' keys
            use_batches: Whether to batch requests

        Returns:
            List of document IDs assigned by the embedding-service

        Raises:
            httpx.HTTPError: If the upload fails
            ValueError: If documents format is invalid
        """
        if not documents:
            return []

        # Validate document format
        for doc in documents:
            if "text" not in doc or "metadata" not in doc:
                raise ValueError(
                    "Each document must have 'text' and 'metadata' keys"
                )

        if not use_batches or len(documents) <= self.batch_size:
            return await self._upload_batch(documents)

        # Process in batches
        all_ids = []
        for i in range(0, len(documents), self.batch_size):
            batch = documents[i : i + self.batch_size]
            batch_ids = await self._upload_batch(batch)
            all_ids.extend(batch_ids)

        return all_ids

    async def _upload_batch(self, documents: List[Dict[str, Any]]) -> List[str]:
        """
        Upload a single batch of documents.

        Args:
            documents: List of documents

        Returns:
            List of document IDs

        Raises:
            httpx.HTTPError: If the upload fails
        """
        if not self._client:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                return await self._do_upload(client, documents)
        return await self._do_upload(self._client, documents)

    async def _do_upload(
        self, client: httpx.AsyncClient, documents: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Perform the actual HTTP request to upload documents.

        Args:
            client: httpx AsyncClient instance
            documents: List of documents

        Returns:
            List of document IDs

        Raises:
            httpx.HTTPError: If the request fails
        """
        payload = {"documents": documents}
        url = f"{self.base_url}/v1/upload"

        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("ids", [])
        except httpx.HTTPStatusError as e:
            raise httpx.HTTPError(
                f"Failed to upload documents to {url}: {e.response.text}"
            )

    async def search(
        self,
        query: str,
        top_k: int = 10,
        score_threshold: float = 0.0,
        filter_: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query.

        Args:
            query: Search query text
            top_k: Number of results to return
            score_threshold: Minimum similarity score
            filter_: Metadata filter (optional)

        Returns:
            List of search results

        Raises:
            httpx.HTTPError: If the search fails
        """
        if not self._client:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                return await self._do_search(
                    client, query, top_k, score_threshold, filter_
                )
        return await self._do_search(
            self._client, query, top_k, score_threshold, filter_
        )

    async def _do_search(
        self,
        client: httpx.AsyncClient,
        query: str,
        top_k: int,
        score_threshold: float,
        filter_: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Perform the actual HTTP request for search.

        Args:
            client: httpx AsyncClient instance
            query: Search query text
            top_k: Number of results to return
            score_threshold: Minimum similarity score
            filter_: Metadata filter

        Returns:
            List of search results

        Raises:
            httpx.HTTPError: If the request fails
        """
        payload = {
            "query": query,
            "top_k": top_k,
            "score_threshold": score_threshold,
            "filter": filter_,
        }
        url = f"{self.base_url}/v1/search"

        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("documents", [])
        except httpx.HTTPStatusError as e:
            raise httpx.HTTPError(
                f"Failed to search documents in {url}: {e.response.text}"
            )

    async def health_check(self) -> bool:
        """
        Check if the embedding-service is healthy.

        Returns:
            True if healthy, False otherwise
        """
        if not self._client:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                return await self._do_health_check(client)
        return await self._do_health_check(self._client)

    async def _do_health_check(self, client: httpx.AsyncClient) -> bool:
        """
        Perform the actual health check request.

        Args:
            client: httpx AsyncClient instance

        Returns:
            True if healthy, False otherwise
        """
        url = f"{self.base_url}/health"
        try:
            response = await client.get(url)
            return response.status_code == 200
        except (httpx.HTTPError, Exception):
            return False
