from fastapi import APIRouter, HTTPException, Query
from typing import Optional
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

import logging
import json

router = APIRouter()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

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
        
        return SearchResponse(documents=document)
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