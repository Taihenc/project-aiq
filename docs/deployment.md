# Deployment Guide

## Prerequisites

- Docker & Docker Compose v2+
- Azure OpenAI API credentials (for search-flow)
- `.env` files configured for each service (see `.env.example` in each service dir)

## Quick Start

```bash
# 1. Configure env files
cp services/embedding-service/.env.example services/embedding-service/.env
cp services/data-ingestion/.env.example services/data-ingestion/.env
cp services/search-flow/.env.example services/search-flow/.env
# Edit each .env with your credentials

# 2. Build & start
docker compose up --build -d

# 3. Verify health
curl http://localhost:8003/health   # embedding-service
curl http://localhost:8002/health   # data-ingestion
curl http://localhost:8000/         # search-flow
```

## Service Ports

| Service            | Port  | Description              |
|--------------------|-------|--------------------------|
| search-flow        | 8000  | AI search orchestration  |
| data-ingestion     | 8002  | Document ingestion       |
| embedding-service  | 8003  | Embedding + Qdrant proxy |
| qdrant             | 6333  | Vector database          |
| backend            | 3000  | API gateway (optional)   |
| web                | 3001  | Frontend UI (optional)   |

## Ingesting Documents

```bash
curl -X POST http://localhost:8002/upload \
  -F "file=@/path/to/document.pdf"
```

## Running Eval Benchmarks

```bash
# 1. Retrieval eval (embedding-service must be running)
cd services/embedding-service
uv run python tests/eval_retrieval.py --no-cleanup

# 2. E2E eval (all services must be running)
cd services/search-flow
uv run python tests/eval_e2e.py

# 3. Generate HTML report
cd services/search-flow
uv run python tests/benchmark_report.py
# Open: services/search-flow/tests/reports/benchmark.html
```

## RAGFlow Comparison (Optional)

```bash
# Start AINGO + RAGFlow stack
docker compose -f docker-compose.yml -f docker-compose.ragflow.yml up -d

# Create dataset in RAGFlow UI (http://localhost:9380), note dataset ID
# Run comparison
cd services/search-flow
uv run python tests/eval_ragflow.py --dataset-id <ID> --ingest

# Regenerate report (now includes comparison)
uv run python tests/benchmark_report.py
```

## Environment Variables

### search-flow
| Variable             | Required | Description               |
|----------------------|----------|---------------------------|
| `AZURE_API_KEY`      | ✅       | Azure OpenAI API key       |
| `AZURE_API_BASE`     | ✅       | Azure OpenAI endpoint      |
| `AZURE_API_VERSION`  | ✅       | API version                |
| `AZURE_MODEL_NAME`   | ✅       | Model deployment name      |
| `LANGFUSE_*`         | ❌       | Langfuse tracing (optional)|

### embedding-service
| Variable           | Required | Default              |
|--------------------|----------|----------------------|
| `QDRANT_URL`       | ❌       | `http://localhost:6333` |
| `COLLECTION_NAME`  | ❌       | `documents`          |
| `EMBEDDING_MODEL`  | ❌       | `BAAI/bge-m3`        |

### data-ingestion
| Variable     | Required | Default                          |
|-------------|----------|----------------------------------|
| `API_URL`   | ❌       | `http://127.0.0.1:8003/v1/upload`|
| `MAX_CHUNK_SIZE` | ❌  | `512`                            |
