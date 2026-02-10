# app/mcp/tools.py
from fastmcp import FastMCP
from app.services.service_tools import service_tools
from app.models.models import (
    SearchRequest
)

mcp = FastMCP("embedding-service")

@mcp.tool()
async def greet(name: str) -> str:
    """Greet the user."""
    return f"Hello, {name}! Welcome to embedding-service."

@mcp.tool()
async def search_documents(search_request: SearchRequest) -> str:
    """Search for similar documents using semantic search."""
    response = await service_tools.search_documents(search_request)
    return format_results(response.documents)

def format_results(documents):
    """Format search results for display."""
    if not documents:
        return "No documents found."
    
    lines = [f"Found {len(documents)} documents:"]
    for i, doc in enumerate(documents, 1):
        score = doc.similarity_score or 0
        metadata = doc.metadata
        file_name = metadata.file or "Unknown"
        page = metadata.pages[0] if metadata.pages else "N/A"
        text = doc.text
        
        lines.append(f"\n{i}. Score: {score:.4f}")
        lines.append(f"   File: {file_name} (Page {page})")
        lines.append(f"   Text: {text}")
    
    return "\n".join(lines)

# @mcp.tool()
# async def get_document(doc_id: str) -> dict:
#     """Retrieve a specific document by ID."""
#     return qdrant_service.get_document(doc_id)