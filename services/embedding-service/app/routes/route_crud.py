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

@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_documents(batch: DocumentUploadRequest):
    try:
        documents = [
            {
                "text": doc.text,
                "metadata": {
                    "order": doc.metadata.order,
                    "file": doc.metadata.file,
                    "file_path": doc.metadata.file_path,
                    "file_type": doc.metadata.file_type,
                    "pages": doc.metadata.pages,
                    "department": doc.metadata.department,
                    "project": doc.metadata.project,
                    "team": doc.metadata.team,
                    "tags": doc.metadata.tags,
                    "is_summary": doc.metadata.is_summary,
                    "sheet_name": doc.metadata.sheet_name,
                    "columns": doc.metadata.columns,
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