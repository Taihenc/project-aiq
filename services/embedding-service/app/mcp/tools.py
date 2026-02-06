# app/mcp/tools.py
from fastmcp import FastMCP
from app.services.qdrant.qdrant_service import qdrant_service
from app.services.embedding.embedding_service import embedding_service

mcp = FastMCP("embedding-service")

@mcp.tool()
async def search_documents(query: str, top_k: int = 10) -> str:
    """Search for similar documents using semantic search."""
    embedding = embedding_service.encode_single(query)
    results = qdrant_service.search(embedding, top_k)
    return format_results(results)

def format_results(results):
    """Format search results for display."""
    if not results:
        return "No documents found."
    
    lines = [f"Found {len(results)} documents:"]
    for i, result in enumerate(results, 1):
        score = result.get("score", 0)
        payload = result.get("payload", {})
        file_name = payload.get("file", "Unknown")
        page = payload.get("page", "N/A")
        text = payload.get("text", "")
        
        lines.append(f"\n{i}. Score: {score:.4f}")
        lines.append(f"   File: {file_name} (Page {page})")
        lines.append(f"   Text: {text}")
    
    return "\n".join(lines)

@mcp.tool()
async def get_document(doc_id: str) -> dict:
    """Retrieve a specific document by ID."""
    return qdrant_service.get_document(doc_id)