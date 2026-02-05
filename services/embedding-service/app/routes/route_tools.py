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

# ==============================================================================
#  NEW TOOLS IMPLEMENTATION
# ==============================================================================



# --- TOOL 1: PAGE CONTEXT RETRIEVAL (Reconstruct pages from chunks) ---
@router.post("/documents/pages", response_model=PageRetrievalResponse)
async def get_pages_context(request: PageRetrievalRequest):
    try:
        reconstructed_pages, total_pages = qdrant_service.get_chunks_by_page_range(
            start_page=request.start_page,
            end_page=request.end_page,    
            file_path=request.file_path,
        )

        return PageRetrievalResponse(
            pages=reconstructed_pages,
            total_pages=total_pages
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve pages: {str(e)}")


# --- TOOL 2: STRUCTURED DATA QUERY (CSV/XLSX Analysis) ---
@router.post("/tools/analyze-data", response_model=StructuredQueryResponse)
async def analyze_structured_data(request: StructuredQueryRequest):
    """
    Tool: Executes a Pandas query on a CSV or Excel file.
    
    **Example Usage:**
    ```json
    {
        "file_path": "/tmp/employees.csv",
        "query": "department == 'HR' & salary > 50000"
    }
    ```
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