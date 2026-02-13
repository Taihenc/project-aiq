"""Business logic for search operations."""

import httpx
from config import settings


async def perform_search(query: str, top_k: int, top_n: int, score_threshold: float) -> str:
    """
    Perform a search using the embedding service.
    
    Args:
        query: The search query text
        top_k: Number of results from semantic search
        top_n: Number of results from rerank
        score_threshold: Minimum similarity score
        
    Returns:
        Formatted string with search results
    """
    url = f"{settings.embedding_service}/v1/search"
    payload = {
        "query": query,
        "top_k": top_k,
        "top_n": top_n,
        "score_threshold": score_threshold
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30.0)
            
        if response.status_code != 200:
            return f"Error: Received status code {response.status_code} from embedding service. Details: {response.text}"
            
        data = response.json()
        documents = data.get("documents", [])
        
        if not documents:
            return "No documents found."
            
        # Format the results
        result_str = f"Found {len(documents)} documents:\n\n"
        for i, doc in enumerate(documents, 1):
            score = doc.get("reranking_score") or doc.get("similarity_score") or 0.0
            metadata = doc.get("metadata", {})
            file_name = metadata.get("file", "Unknown")
            page = metadata.get("page", -1)
            
            result_str += f"{i}. [Score: {score:.4f}] {file_name} (Page {page})\n"
            result_str += f"   Content: {doc.get('text', '')}\n\n"
            
        return result_str

    except httpx.RequestError as e:
        return f"Error: Could not connect to embedding service at {url}. Is it running? Details: {str(e)}"
    except Exception as e:
        return f"Error: An unexpected error occurred. Details: {str(e)}"
