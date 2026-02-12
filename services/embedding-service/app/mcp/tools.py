# app/mcp/tools.py
from fastmcp import FastMCP
from app.services.service_tools import service_tools
from app.models.models import (
    SearchRequest,
    PageRetrievalRequest,
    ChunkContextRequest,
    PageRetrievalResponse,
    ChunkContextResponse
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
        lines.append(f"   ID: {doc.id}")
        lines.append(f"   File: {file_name} (Page {page})")
        lines.append(f"   Path: {metadata.file_path}")
        lines.append(f"   Text: {text}")
    

    return "\n".join(lines)

@mcp.tool()
async def get_pages(request: PageRetrievalRequest) -> str:
    """Retrieve pages from a document."""
    response = await service_tools.get_pages_context(request)
    return format_pages_results(response)

@mcp.tool()
async def get_chunks(request: ChunkContextRequest) -> str:
    """Retrieve context chunks around a specific chunk."""
    response = await service_tools.get_chunks_context(request)
    return format_chunks_results(response)

def format_pages_results(response: PageRetrievalResponse) -> str:
    """Format page retrieval results for display."""
    if not response.pages:
        return "No pages found."
    
    lines = [f"Found {len(response.pages)} pages (Total: {response.total_pages}):"]
    for i, page in enumerate(response.pages, 1):
        lines.append(f"\nPage {page.page_number}:")
        lines.append(f"{page.text}")
    
    return "\n".join(lines)

def format_chunks_results(response: ChunkContextResponse) -> str:
    """Format chunk context results for display."""
    if not response.chunks:
        return "No chunks found."
    
    lines = [f"Found {len(response.chunks)} chunks:"]
    for i, chunk in enumerate(response.chunks, 1):
        lines.append(f"\nChunk {i} (ID: {chunk.id}):")
        lines.append(f"{chunk.text}")
    
    return "\n".join(lines)

# @mcp.tool()
# async def get_document(doc_id: str) -> dict:
#     """Retrieve a specific document by ID."""
#     return qdrant_service.get_document(doc_id)