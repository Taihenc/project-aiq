# Search Flow Service

AI-powered search orchestration using CrewAI, Azure OpenAI, and HyDE query expansion.

## Architecture

- **CrewAI Flow**: Orchestrates a search agent with tools for document retrieval
- **HyDE**: Generates hypothetical answers to enhance search queries
- **MCP**: Connects to embedding-service via MCP protocol for search/pages/chunks
- **Langfuse**: Optional tracing for observability

## Endpoints

| Method | Path                          | Description            |
|--------|-------------------------------|------------------------|
| POST   | `/api/v1/completions`         | Sync search completion |
| POST   | `/api/v1/completions/stream`  | Streaming completion   |
| GET    | `/`                           | Health check           |

## Modes

- `auto` — Agent decides whether to search, lookup, or chat
- `search` — Force document search via embedding-service
- `lookup` — Page/chunk retrieval only (no semantic search)
- `chat` — Direct LLM response, no tools

## Run Locally

```bash
cp .env.example .env  # Configure Azure credentials
uv sync
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## Run via Docker

```bash
docker compose up search-flow -d
```

## CLI Test Client

```bash
uv run python client.py
```

## Eval

```bash
uv run python tests/eval_e2e.py
uv run python tests/benchmark_report.py
```
