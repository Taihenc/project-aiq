# Embedding Service

Embedding Service for document processing, vectorization and Qdrant management.

## Features

- Document chunking and processing
- Text embedding generation
- Vector similarity search using Qdrant
- Document metadata management
- CRUD operations for documents

## Development

```bash
# Install dependencies
uv sync

# Run development server
source .venv/bin/activate && uvicorn main:app --reload --port 8003
```
