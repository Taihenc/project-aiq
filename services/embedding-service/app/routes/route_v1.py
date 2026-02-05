from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any, Literal
import logging
import json
import os
import pandas as pd
from pydantic import BaseModel, Field
from qdrant_client.http import models as q_models

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
)
from app.services.qdrant.qdrant_service import qdrant_service
from app.services.embedding.embedding_service import embedding_service
from app.services.reranking.reranking_service import reranking_service

router = APIRouter()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

# ==============================================================================
#  NEW MODELS FOR TOOLS
# ==============================================================================

class PageFilter(BaseModel):
    file_path: Optional[str] = None
    directory: Optional[str] = None
    mime_type: Optional[str] = None
    tags: Optional[List[str]] = None
    department: Optional[str] = None
    team: Optional[str] = None
    project: Optional[str] = None

class PageNavigation(BaseModel):
    anchor_page_num: int = Field(..., description="The reference page number")
    page_range: int = Field(1, ge=0, description="Number of additional pages to retrieve")
    mode: Literal['exact', 'forward', 'next', 'backward', 'prev', 'around', 'both'] = Field(
        'exact', description="Direction: 'forward', 'backward', or 'around'"
    )

class PageRetrievalRequest(BaseModel):
    filter: Optional[PageFilter] = None
    navigation: Optional[PageNavigation] = None

class PageContent(BaseModel):
    page_number: int
    text: str
    file_path: str
    metadata: Dict[str, Any]

class PageRetrievalResponse(BaseModel):
    pages: List[PageContent]
    total_found: int

class StructuredQueryRequest(BaseModel):
    file_path: str = Field(..., description="Full path to the csv or xlsx file")
    sheet_name: Optional[str] = Field(None, description="The specific sheet name to query (Required for Excel)")
    query: Optional[str] = Field(None, description="Pandas query expression. If blank, returns data preview.")

class StructuredQueryResponse(BaseModel):
    result: str
    metadata: Dict[str, Any]
    success: bool
    error: Optional[str] = None

# ==============================================================================
#  EXISTING ENDPOINTS
# ==============================================================================

@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_documents(batch: DocumentUploadRequest):
    try:
        documents = [
            {
                "text": doc.text,
                "metadata": {
                    "file": doc.metadata.file,
                    "file_path": doc.metadata.file_path,
                    "file_type": doc.metadata.file_type,
                    "page": doc.metadata.page,
                    "created_at": doc.metadata.created_at,
                    "checksum": doc.metadata.checksum,
                }
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

        document = [DocumentResponse(
            id=document["id"],
            text=document["text"],
            metadata=document["metadata"],
            similarity_score=document["score"],
            reranking_score=0.0
        ) for document in documents]

        log_payload = {
            "event": "similarity_search_completed",
            "query": search_request.query,
            "num_documents": len(document),
            "results": [
                {
                    "id": doc.id,
                    "similarity_score": doc.similarity_score,
                }
                for doc in document[:3]
            ]
        }

        logger.info("Similarity search completed:\n%s", json.dumps(log_payload, indent=2, ensure_ascii=False))

        if search_request.top_n is not None:
            document = reranking_service.rerank(
                query=search_request.query,
                documents=document,
                top_n=search_request.top_n
            )

            log_payload = {
                "event": "reranking_completed",
                "query": search_request.query,
                "num_documents": len(document),
                "results": [
                    {
                        "id": doc.id,
                        "similarity_score": doc.similarity_score,
                        "reranking_score": doc.reranking_score
                    }
                    for doc in document[:3]
                ]
            }

            logger.info("Reranking completed:\n%s", json.dumps(log_payload, indent=2, ensure_ascii=False))
        
        return SearchResponse(documents=document, counts=len(document))
    except Exception as e:
        logger.exception("Search failed", extra={"query": search_request.query})
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
#  NEW TOOLS
# ==============================================================================

@router.post("/documents/pages", response_model=PageRetrievalResponse)
async def get_pages_context(request: PageRetrievalRequest):
    try:
        must_filters = []
        if request.filter:
            f = request.filter
            if f.file_path:
                must_filters.append(q_models.FieldCondition(key="metadata.file_path", match=q_models.MatchValue(value=f.file_path)))
            if f.mime_type:
                must_filters.append(q_models.FieldCondition(key="metadata.file_type", match=q_models.MatchValue(value=f.mime_type)))
            if f.tags:
                for tag in f.tags:
                    must_filters.append(q_models.FieldCondition(key="metadata.tags", match=q_models.MatchValue(value=tag)))

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
            
            must_filters.append(q_models.FieldCondition(
                key="metadata.pages", # Matches ContextBuilder metadata key
                range=q_models.Range(gte=start_p, lte=end_p)
            ))

        # Fetches all matching chunks via Scroll API implemented in service
        raw_chunks = qdrant_service.get_chunks_by_filter(filters=must_filters)

        pages_map = {}
        requested_page_set = set(range(start_p, end_p + 1)) if request.navigation else None

        for chunk in raw_chunks:
            p_nums = chunk.get("metadata", {}).get("pages", [])
            for p_num in p_nums:
                if request.navigation and p_num not in requested_page_set:
                    continue
                if p_num not in pages_map:
                    pages_map[p_num] = []
                if not any(c["id"] == chunk["id"] for c in pages_map[p_num]):
                    pages_map[p_num].append(chunk)

        reconstructed_pages = []
        for p_num in sorted(pages_map.keys()):
            chunks = pages_map[p_num]
            chunks.sort(key=lambda c: c.get("metadata", {}).get("order", 0))
            
            full_text = "\n".join([c["text"] for c in chunks])
            base_meta = chunks[0]["metadata"]
            
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
        logger.error(f"Page retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tools/analyze-data", response_model=StructuredQueryResponse)
async def analyze_structured_data(request: StructuredQueryRequest):
    try:
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

        df = None
        if request.file_path.endswith('.csv'):
            df = pd.read_csv(request.file_path)
        elif request.file_path.endswith(('.xlsx', '.xls')):
            if not request.sheet_name:
                return StructuredQueryResponse(result="", metadata={}, success=False, error="sheet_name required for Excel")
            df = pd.read_excel(request.file_path, sheet_name=request.sheet_name)
        else:
            return StructuredQueryResponse(result="", metadata={}, success=False, error="Unsupported format")

        try:
            # Handle blank query as a data preview
            if not request.query or not request.query.strip():
                filtered_df = df
            else:
                filtered_df = df.query(request.query)
            
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
            return StructuredQueryResponse(result="", metadata={}, success=False, error=f"Query error: {e}")
    except Exception as e:
        logger.error(f"Data analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))