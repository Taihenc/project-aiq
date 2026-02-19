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
    # PageContent,
    StructuredQueryRequest,
    StructuredQueryResponse,
    ChunkContextRequest,
    ChunkContextResponse,
    FileReferenceRequest,
    FileReferenceResponse,
    StructuredFileReferenceResponse,
)

from app.services.service_tools import service_tools

import logging
import json

router = APIRouter()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)


@router.post("/query", response_model=QueryResponse)
async def get_embedding(query_request: QueryRequest):
    return await service_tools.get_embedding(query_request)


@router.post("/search", response_model=SearchResponse)
async def search_documents(search_request: SearchRequest):
    return await service_tools.search_documents(search_request)

# ==============================================================================
#  NEW TOOLS IMPLEMENTATION
# ==============================================================================

@router.post("/pages", response_model=PageRetrievalResponse)
async def get_pages_context(request: PageRetrievalRequest):
    return await service_tools.get_pages_context(request)

@router.post("/chunks", response_model=ChunkContextResponse)
async def get_chunks_context(request: ChunkContextRequest):
    return await service_tools.get_chunks_context(request)

@router.post("/query-structured-data", response_model=StructuredQueryResponse)
async def query_structured_data(request: StructuredQueryRequest):
    return await service_tools.query_structured_data(request)

@router.post("/text-by-file-reference", response_model=FileReferenceResponse)
async def get_text_by_file_reference(request: FileReferenceRequest):
    return await service_tools.get_text_by_file_reference(request)

@router.post("/structured-file-reference", response_model=StructuredFileReferenceResponse)
async def get_structured_file_reference(request: FileReferenceRequest):
    return await service_tools.get_structured_file_reference(request)
