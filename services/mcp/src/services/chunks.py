"""Business logic for chunk retrieval operations."""

import httpx
from config import settings


async def retrieve_chunks(
    chunk_id: str,
    backward: int,
    forward: int,
) -> str:
    """
    Retrieve surrounding chunks for a given chunk ID.

    Args:
        chunk_id: Target chunk ID
        backward: Number of chunks before
        forward: Number of chunks after

    Returns:
        Formatted string with retrieved chunks
    """
    url = f"{settings.embedding_service}/v1/chunks"
    payload = {
        "chunk_id": chunk_id,
        "backward": backward,
        "forward": forward,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30.0)

        if response.status_code != 200:
            return (
                f"Error: Received status code {response.status_code} from embedding service. "
                f"Details: {response.text}"
            )

        data = response.json()
        chunks = data.get("chunks", [])

        if not chunks:
            return "No chunks found."

        result_str = (
            f"Retrieved chunks around chunk_id: {chunk_id} "
            f"(backward={backward}, forward={forward})\n\n"
        )

        for chunk in chunks:
            cid = chunk.get("chunk_id", "unknown")
            text = chunk.get("text", "")

            result_str += f"Chunk ID: {cid}\n"
            result_str += f"{text}\n\n"

        return result_str

    except httpx.RequestError as e:
        return (
            f"Error: Could not connect to embedding service at {url}. "
            f"Is it running? Details: {str(e)}"
        )
    except Exception as e:
        return f"Error: An unexpected error occurred. Details: {str(e)}"
