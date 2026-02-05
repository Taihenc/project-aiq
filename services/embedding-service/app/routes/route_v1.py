import pandas as pd
import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from qdrant_client.http import models as q_models 

# Import ALL models including the new ones
from app.models.models import (
    DocumentUploadRequest,
    DocumentUploadResponse,
    SearchRequest,
    DocumentResponse,
    SearchResponse,
    DocumentsResponse,
    QueryRequest,
    QueryResponse,
    DocumentUpdateRequest,
    DocumentUpdateResponse,
    DocumentDeleteResponse,
    # New Tool Models
    PageRetrievalRequest,
    PageRetrievalResponse,
    PageContent,
    StructuredQueryRequest,
    StructuredQueryResponse
)

from app.services.qdrant.qdrant_service import qdrant_service
from app.services.embedding.embedding_service import embedding_service
from app.services.reranking.reranking_service import reranking_service

router = APIRouter()

# ==============================================================================
#  EXISTING ENDPOINTS
# ==============================================================================

@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_documents(batch: DocumentUploadRequest):
    try:
        documents = [
            {
                "text": doc.text,
                "metadata": doc.metadata
            }
            for doc in batch.documents
        ]
        
        doc_ids = qdrant_service.upload_documents(documents)
        
        return DocumentUploadResponse(
            ids=doc_ids,
            count=len(doc_ids),
            message="Documents uploaded successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload documents: {str(e)}")

@router.post("/search", response_model=SearchResponse)
async def search_documents(search_request: SearchRequest):
    try:
        documents = qdrant_service.search(
            query=search_request.query,
            limit=search_request.top_k,
            score_threshold=search_request.score_threshold,
            query_filter=search_request.filter
        )

        format_document = [DocumentResponse(
            id=document["id"],
            text=document["text"],
            metadata=document["metadata"],
            score=document["score"]
        ) for document in documents]

        results = reranking_service.rerank(
            query=search_request.query,
            documents=format_document,
            top_n=search_request.top_n
        )
        
        return SearchResponse(documents=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/documents", response_model=DocumentsResponse)
async def get_documents(
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Maximum number of documents to return"),
    offset: int = Query(0, ge=0, description="Number of documents to skip")
):
    try:
        documents = qdrant_service.get_documents(limit=limit, offset=offset)
        
        return DocumentsResponse(
            documents=[
                DocumentResponse(
                    id=doc["id"],
                    text=doc["text"],
                    metadata=doc["metadata"]
                )
                for doc in documents
            ],
            total=len(documents),
            limit=limit,
            offset=offset
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {str(e)}")

@router.post("/query", response_model=QueryResponse)
async def get_embedding(query_request: QueryRequest):
    try:
        embedding = embedding_service.encode_single(query_request.text)
        
        return QueryResponse(
            embedding=embedding,
            dimension=len(embedding)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@router.get("/get/{id}", response_model=DocumentResponse)
async def get_document(id: str):
    try:
        document = qdrant_service.get_document(id)
        
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentResponse(
            id=document["id"],
            text=document["text"],
            metadata=document["metadata"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve document: {str(e)}")

@router.put("/edit/{id}", response_model=DocumentUpdateResponse)
async def update_document(id: str, update_ducument_request: DocumentUpdateRequest):
    try:
        success = qdrant_service.update_document(
            doc_id=id,
            text=update_ducument_request.text,
            metadata=update_ducument_request.metadata
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentUpdateResponse(
            id=id,
            message="Document updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")

@router.delete("/delete/{id}", response_model=DocumentDeleteResponse)
async def delete_document(id: str):
    try:
        success = qdrant_service.delete_document(id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentDeleteResponse(message="Document deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

# ==============================================================================
#  NEW TOOLS IMPLEMENTATION
# ==============================================================================

# --- TOOL 1: PAGE CONTEXT RETRIEVAL (Reconstruct pages from chunks) ---
@router.post("/documents/pages", response_model=PageRetrievalResponse)
async def get_pages_context(request: PageRetrievalRequest):
    try:
        # 1. Construct Filters
        must_filters = []
        if request.filter:
            f = request.filter
            if f.file_path:
                must_filters.append(q_models.FieldCondition(key="metadata.file_path", match=q_models.MatchValue(value=f.file_path)))
            if f.directory:
                must_filters.append(q_models.FieldCondition(key="metadata.file_path", match=q_models.MatchText(text=f.directory)))
            if f.mime_type:
                must_filters.append(q_models.FieldCondition(key="metadata.file_type", match=q_models.MatchValue(value=f.mime_type)))
            if f.department:
                must_filters.append(q_models.FieldCondition(key="metadata.org.dept", match=q_models.MatchValue(value=f.department)))
            if f.team:
                must_filters.append(q_models.FieldCondition(key="metadata.org.team", match=q_models.MatchValue(value=f.team)))
            if f.tags:
                for tag in f.tags:
                    must_filters.append(q_models.FieldCondition(key="metadata.tags", match=q_models.MatchValue(value=tag)))

        # 2. Calculate Page Range
        start_p, end_p = 1, 999999
        if request.navigation:
            nav = request.navigation
            anchor = nav.anchor_page_num
            rng = nav.page_range
            mode = nav.mode.lower()
            
            start_p, end_p = anchor, anchor
            if mode in ['forward', 'next']:
                end_p = anchor + rng
            elif mode in ['backward', 'prev']:
                start_p = max(1, anchor - rng)
            elif mode in ['around', 'both']:
                start_p = max(1, anchor - rng)
                end_p = anchor + rng
            
            # Use strict range filter for page numbers
            must_filters.append(q_models.FieldCondition(
                key="metadata.pages",
                range=q_models.Range(gte=start_p, lte=end_p)
            ))

        # 3. Fetch Chunks (Using helper from service)
        raw_chunks = qdrant_service.get_chunks_by_filter(filters=must_filters)

        # 4. Reconstruct Pages
        pages_map = {}
        requested_page_set = set(range(start_p, end_p + 1)) if request.navigation else None

        for chunk in raw_chunks:
            p_nums = chunk.get("metadata", {}).get("pages", [])
            for p_num in p_nums:
                if request.navigation and p_num not in requested_page_set:
                    continue
                if p_num not in pages_map:
                    pages_map[p_num] = []
                # Deduplicate chunks if id is present
                if not any(c["id"] == chunk["id"] for c in pages_map[p_num]):
                    pages_map[p_num].append(chunk)

        reconstructed_pages = []
        for p_num in sorted(pages_map.keys()):
            chunks = pages_map[p_num]
            # Sort by order metadata for correct text flow
            chunks.sort(key=lambda c: c.get("metadata", {}).get("order", 0))
            
            full_text = "\n".join([c["text"] for c in chunks])
            base_meta = chunks[0]["metadata"] if chunks else {}
            
            reconstructed_pages.append(PageContent(
                page_number=p_num,
                text=full_text,
                file_path=base_meta.get("file_path", ""),
                metadata=base_meta
            ))

        return PageRetrievalResponse(
            pages=reconstructed_pages,
            total_found=len(reconstructed_pages)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve pages: {str(e)}")


# --- TOOL 2: STRUCTURED DATA QUERY (CSV/XLSX Analysis) ---
@router.post("/tools/analyze-data", response_model=StructuredQueryResponse)
async def analyze_structured_data(request: StructuredQueryRequest):
    """
    Tool: Executes a Pandas query on a CSV or Excel file.
    """
    try:
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

        df = None
        
        # A. Load Data
        if request.file_path.endswith('.csv'):
            df = pd.read_csv(request.file_path)
        elif request.file_path.endswith(('.xlsx', '.xls')):
            if not request.sheet_name:
                return StructuredQueryResponse(
                    result="", metadata={}, success=False,
                    error="Missing 'sheet_name'. Required for Excel files."
                )
            try:
                df = pd.read_excel(request.file_path, sheet_name=request.sheet_name)
            except ValueError:
                 return StructuredQueryResponse(
                    result="", metadata={}, success=False, 
                    error=f"Sheet '{request.sheet_name}' not found."
                )
        else:
            return StructuredQueryResponse(
                result="", metadata={}, success=False, 
                error="Unsupported file format."
            )

        # B. Execute Query
        try:
            if not request.query or not request.query.strip():
                filtered_df = df
            else:
                filtered_df = df.query(request.query)
            
            # Truncate if result is huge
            limit_rows = 50
            result_md = filtered_df.head(limit_rows).to_markdown(index=False)
            if len(filtered_df) > limit_rows:
                result_md += f"\n\n... ({len(filtered_df)-limit_rows} more rows truncated) ..."

            return StructuredQueryResponse(
                result=result_md,
                metadata={
                    "total_rows": len(filtered_df),
                    "source_file": os.path.basename(request.file_path),
                    "sheet": request.sheet_name
                },
                success=True
            )
        except Exception as e:
            return StructuredQueryResponse(
                result="", metadata={}, success=False,
                error=f"Invalid Query Syntax: {str(e)}"
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")