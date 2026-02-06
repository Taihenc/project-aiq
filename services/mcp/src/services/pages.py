"""Business logic for page retrieval operations."""

import httpx
from config import settings


async def retrieve_pages(
    file_path: str,
    start_page: int,
    end_page: int,
) -> str:
    """
    Retrieve pages from a document via the embedding service.

    Args:
        file_path: Path of the file in the embedding service
        start_page: Starting page index (inclusive)
        end_page: Ending page index (exclusive or inclusive depending on service)

    Returns:
        Formatted string with retrieved page contents
    """
    url = f"{settings.embedding_service}/v1/pages"
    payload = {
        "file_path": file_path,
        "start_page": start_page,
        "end_page": end_page,
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
        pages = data.get("pages", [])

        if not pages:
            return "No pages found."

        # Format the results
        result_str = (
            f"Retrieved pages {start_page} to {end_page} "
            f"from file: {file_path}\n\n"
        )

        for page in pages:
            page_number = page.get("page", -1)
            content = page.get("text", "")

            result_str += f"Page {page_number}:\n"
            result_str += f"{content}\n\n"

        return result_str

    except httpx.RequestError as e:
        return (
            f"Error: Could not connect to embedding service at {url}. "
            f"Is it running? Details: {str(e)}"
        )
    except Exception as e:
        return f"Error: An unexpected error occurred. Details: {str(e)}"
