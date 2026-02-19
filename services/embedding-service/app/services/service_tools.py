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
    FileReferenceResponse
)

from app.services.qdrant.qdrant_service import qdrant_service
from app.services.embedding.embedding_service import embedding_service
from app.services.reranking.reranking_service import reranking_service
from app.services.formatter import formatter_service

import logging
import json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

class Tools:
    def __init__(self):
        pass

    async def get_embedding(self, query_request: QueryRequest) -> QueryResponse:
        try:
            embedding = embedding_service.encode_single(query_request.text)
            
            return QueryResponse(
                embedding=embedding,
                dimension=len(embedding)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")
        

    async def search_documents(self, search_request: SearchRequest) -> SearchResponse:
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

    async def get_pages_context(self, request: PageRetrievalRequest) -> PageRetrievalResponse:
        try:
            reconstructed_pages, total_pages = qdrant_service.get_chunks_by_page_range(
                start_page=request.start_page,
                end_page=request.end_page,    
                file_path=request.file_path,
            )

            log_payload = {
                "event": "pages_context_retrieved",
                "file_path": request.file_path,
                "start_page": request.start_page,
                "end_page": request.end_page,
                "num_documents": len(reconstructed_pages),
                "results": [
                    {
                        "page_number": page.page_number
                    }
                    for page in reconstructed_pages[:3]
                ]
            }

            logger.info("Pages context retrieved:\n%s", json.dumps(log_payload, indent=2, ensure_ascii=False))

            return PageRetrievalResponse(
                pages=reconstructed_pages,
                total_pages=total_pages
            )

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to retrieve pages: {str(e)}")

    async def get_chunks_context(self, request: ChunkContextRequest) -> ChunkContextResponse:
        """
        Tool: Retrieve neighboring chunks for a specific chunk ID to expand context.

        **Example Usage:**
        ```json
        {
            "chunk_id": "881bc625-e293-4403-b152-49852c0ec9a0",
            "backward": 2,  // Get 2 chunks before
            "forward": 2    // Get 2 chunks after
        }
        ```
        """
        try:
            chunk_id = qdrant_service.get_chunk_by_order(request.file_path, request.chunk_number)["id"]

            chunks = qdrant_service.get_neighbor_chunks(
                chunk_id=chunk_id,
                backward=request.backward,
                forward=request.forward
            )

            response_chunks = [
                DocumentResponse(
                    id=c["id"],
                    text=c["text"],
                    metadata=c["metadata"],
                ) for c in chunks
            ]

            log_payload = {
                "event": "chunks_context_retrieved",
                "chunk_id": chunk_id,
                "backward": request.backward,
                "forward": request.forward,
                "num_chunks": len(response_chunks),
                "results": [
                    {
                        "id": chunk.id,
                        "text": chunk.text[:100] + "..." if len(chunk.text) > 100 else chunk.text,
                    }
                    for chunk in response_chunks[:3]
                ]
            }

            logger.info("Chunks context retrieved:\n%s", json.dumps(log_payload, indent=2, ensure_ascii=False))

            return ChunkContextResponse(chunks=response_chunks)

        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to retrieve chunks: {str(e)}")

    # --- TOOL 2: STRUCTURED DATA QUERY (CSV/XLSX Analysis) ---

    def _resolve_file_path(self, file_path: str) -> Optional[str]:
        """
        Resolves file path relative to the embedding-service.
        Specifically checks:
        1. Exact path
        2. ../data-ingestion/ (for paths like 'uploaded-files/file.csv')
        """
        # 1. Exact path or absolute path
        if os.path.exists(file_path):
            return os.path.abspath(file_path)

        # 2. Check relative to data-ingestion service
        # Assuming embedding-service is at /services/embedding-service
        # And data-ingestion is at /services/data-ingestion
        # So we traverse up one level: ../data-ingestion/
        
        # Construct potential path in data-ingestion
        # effective path becomes: ../data-ingestion/<file_path>
        data_ingestion_path = os.path.join("..", "data-ingestion", file_path)
        
        if os.path.exists(data_ingestion_path):
            return os.path.abspath(data_ingestion_path)

        return None

    async def query_structured_data(self, request: StructuredQueryRequest) -> StructuredQueryResponse:
        """
        Tool: Executes a Pandas query on a CSV or Excel file.
        
        **Example Usage:**
        ```json
        {
            "file_path": "employees.xlsx", 
            "sheet_name": "Sheet1",  // REQUIRED if file is .xlsx/.xls
            "query": "department == 'HR' & salary > 50000" // Optional pandas query string
        }
        ```
        """
        debug_logs = []
        try:
            debug_logs.append(f"Analyzing {request.file_path}")
            resolved_path = _resolve_file_path(request.file_path)
            debug_logs.append(f"Initial determination: {resolved_path}")
            
            # If not found locally, try looking it up in Qdrant by name (assuming input is filename)
            if not resolved_path:
                # Try to find the file path via Qdrant metadata
                potential_filename = os.path.basename(request.file_path)
                qdrant_path = None
                try:
                    # Direct lookup using client to avoid modifying qdrant_service
                    qdrant_service._ensure_collection()
                    results, _ = qdrant_service.client.scroll(
                        collection_name=qdrant_service.collection_name,
                        scroll_filter=q_models.Filter(
                            must=[
                                q_models.FieldCondition(
                                    key="file", # Metadata is flattened in payload
                                    match=q_models.MatchValue(value=potential_filename)
                                )
                            ]
                        ),
                        limit=1,
                        with_payload=True
                    )
                    if results and results[0].payload:
                        qdrant_path = results[0].payload.get("file_path")
                        debug_logs.append(f"Qdrant lookup found path: {qdrant_path}")
                    else:
                        debug_logs.append("Qdrant lookup returned no results")

                except Exception as e:
                    debug_logs.append(f"Lookup failed: {e}")

                if qdrant_path:
                    resolved_path_q = _resolve_file_path(qdrant_path)
                    if resolved_path_q:
                        resolved_path = resolved_path_q
                        debug_logs.append(f"Resolved from Qdrant path: {resolved_path}")
                    else:
                        debug_logs.append(f"Could not resolve path from Qdrant value: {qdrant_path}")

            if not resolved_path:
                raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}. Debug: {'; '.join(debug_logs)}")

            df = None
            
            # A. Load Data
            if resolved_path.endswith('.csv'):
                df = pd.read_csv(resolved_path)
            elif resolved_path.endswith(('.xlsx', '.xls')):
                if not request.sheet_name:
                    return StructuredQueryResponse(
                        result="", metadata={}, success=False,
                        error="Missing 'sheet_name'. Required for Excel files."
                    )
                try:
                    df = pd.read_excel(resolved_path, sheet_name=request.sheet_name)
                except ValueError:
                    return StructuredQueryResponse(
                        result="", metadata={}, success=False, 
                        error=f"Sheet '{request.sheet_name}' not found."
                    )
            else:
                return StructuredQueryResponse(
                    result="", metadata={}, success=False, 
                    error=f"Unsupported file format: {resolved_path}"
                )

            # B. Execute Query
            try:
                if not request.query or not request.query.strip():
                    filtered_df = df
                else:
                    filtered_df = df.query(request.query)
                
                # Truncate if result is huge
                limit_rows = 50
                # Custom Markdown conversion to avoid 'tabulate' dependency
                markdown_lines = []
                # Header
                columns = filtered_df.columns.tolist()
                markdown_lines.append("| " + " | ".join(map(str, columns)) + " |")
                markdown_lines.append("| " + " | ".join(["---"] * len(columns)) + " |")
                
                # Rows
                for _, row in filtered_df.head(limit_rows).iterrows():
                    markdown_lines.append("| " + " | ".join(map(str, row.tolist())) + " |")
                
                result_md = "\n".join(markdown_lines)
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

    async def get_text_by_file_reference(self, request: FileReferenceRequest):
        try:
            for file in request.files:
                for page in file.pages:
                    for chunk in page.chunks:
                        retrieve_chunk = qdrant_service.get_chunk_by_order(file.file_path, chunk.chunk_number)
                        chunk.text = retrieve_chunk["text"]
            
            result_text = formatter_service.format_files_to_text(request.files)
            return FileReferenceResponse(
                result = result_text
            )

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    

service_tools = Tools()