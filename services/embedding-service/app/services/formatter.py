import pandas as pd
import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.models.models import (
    File,
    Page,
    Chunk,
    SearchResponse,
    PageRetrievalResponse,
    ChunkContextResponse,
)

class Formatter:
    def __init__(self):
        pass

    def sort_files(self, files: List[File]) -> List[File]:
        files_sorted = sorted(files, key=lambda f: f.file_path)

        for file in files_sorted:
            file.pages = sorted(file.pages, key=lambda p: p.page_number)

            for page in file.pages:
                page.chunks = sorted(page.chunks, key=lambda c: c.chunk_number)

        return files_sorted
    
    def format_files_to_text(self, files: List[File]):
        files = self.sort_files(files)
        lines = []
        for file in files:
            lines.append(f"File: {file.file_path}")
            for page in file.pages:
                lines.append(f"\tPage: {page.page_number}")
                for chunk in page.chunks:
                    lines.append(f"\t\tChunk: {chunk.chunk_number}")
                    lines.append(f"\t\t\t{chunk.text.replace("\n", "\n\t\t\t")}")
        return "\n".join(lines)
        
    def format_search_response(self, search_response: SearchResponse):
        files = {}
        for document in search_response.documents:
            file_path = document.metadata.file_path
            page_number = document.metadata.pages[0]
            chunk_number = document.metadata.order
            text = document.text
            if file_path not in files:
                files[file_path] = {}
            
            if page_number not in files[file_path]:
                files[file_path][page_number] = {}

            files[file_path][page_number][chunk_number] = {
                "text": text,
                "score": document.reranking_score or document.similarity_score,
            }

        files_format = [
            File(
                file_path=file_path,
                pages=[
                    Page(
                        page_number=page_number,
                        chunks=[
                            Chunk(
                                chunk_number=chunk_number,
                                text=chunk_data["text"],
                                score=chunk_data["score"]
                            )
                            for chunk_number, chunk_data in chunks.items()
                        ]
                    ) 
                    for page_number, chunks in pages.items()
                ] 
            )
            for file_path, pages in files.items()
        ]
        return self.format_files_to_text(files_format)

    def format_get_pages_response(self, file_path: str, pages_response: PageRetrievalResponse):
        file = File(
            file_path = file_path,
            pages = [
                page
                for page in pages_response.pages
            ]
        )

        return self.format_files_to_text([file])

    def format_get_chunks_response(self, response: ChunkContextResponse):
        file_path = response.chunks[0].metadata.file_path
        file = File(
            file_path = file_path,
            pages = []   
        )
        start_page = response.chunks[0].metadata.pages[0]
        end_page = response.chunks[-1].metadata.pages[-1]

        for i in range(start_page, end_page + 1):
            page = Page(
                page_number = i,
                chunks = []
            )
            for chunk in response.chunks:
                if chunk.metadata.pages[0] == i:
                    page.chunks.append(Chunk(
                        chunk_number = chunk.metadata.order,
                        text = chunk.text,
                    ))
            file.pages.append(page)
        
        return self.format_files_to_text([file])
            

formatter_service = Formatter()