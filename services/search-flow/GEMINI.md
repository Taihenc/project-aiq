# Search Flow Service

Service for managing complex Search workflows using AI agents (CrewAI) and FastAPI.

## Project Overview

- **Purpose:** A microservice that orchestrates multi-agent search flows to provide structured answers to user queries, utilizing external knowledge bases and model context protocols (MCP).
- **Core Technologies:**
    - **Backend:** Python 3.11+, FastAPI
    - **AI Orchestration:** CrewAI (Flows, Agents, Tasks)
    - **Models:** Azure OpenAI (via LiteLLM)
    - **Infrastructure:** Redis (caching), MongoDB (Motor), MCP (Model Context Protocol)
    - **Tracing:** Langfuse, OpenTelemetry
    - **Dependency Management:** `uv`

## Architecture

The project follows a modified Clean Architecture/Service pattern:

```text
src/
├── main.py             # FastAPI entry point & lifespan management
├── config/             # Settings, logging, and prompts configuration
├── routers/            # API endpoint definitions (Search)
├── services/           # Business logic orchestration
│   ├── search_service.py   # Primary service handling flow execution and streaming parsing
│   └── crew/           # CrewAI specific implementations
│       ├── flow.py     # Main SearchCrewFlow definition and state management
│       ├── agents.py   # Agent definitions (Search Agent)
│       ├── tasks.py    # Task definitions for agents
│       └── tools/      # Custom tools and MCP proxies (including HyDE logic)
├── models/             # Internal state and flow models
└── dtos/               # Data Transfer Objects for API requests/responses
```

## Building and Running

### Prerequisites
- Python 3.11+
- `uv` (recommended)

### Installation
```bash
uv sync
```

### Running the Service
```bash
uv run python src/main.py
```

### Environment Variables
A `.env` file is required with the following minimum configuration:
```env
ENVIRONMENT=development
DEBUG=true
AZURE_API_KEY=your_key
AZURE_API_BASE=your_base_url
AZURE_API_VERSION=2024-02-15-preview
AZURE_MODEL_NAME=gpt-4o
MCP_SERVER_URL=http://localhost:8003/v1/mcp/sse
EMBEDDING_SERVICE_URL=http://localhost:8003
```

## Development Conventions

### Coding Style
- **Type Safety:** Heavily utilizes Pydantic (v2) for data validation and configuration (`BaseSettings`).
- **Asynchronous:** Most operations (API, Flow execution, Database) are `async`.
- **Logging:** Uses `loguru` for structured logging.
- **Error Handling:** Centralized through FastAPI routers and specific service-level try-except blocks.

### Testing
- **Framework:** `pytest` with `pytest-asyncio`.
- **Command:** `uv run pytest` (Inferred).
- **Location:** The project does not currently have a dedicated `tests/` directory in the repository root, but new tests should be added there following standard pytest conventions.

### Key Workflows
1. **Search Flow Modes:** The service supports multiple modes (`auto`, `search`, `lookup`, `chat`). The `SearchCrewFlow` dynamically assigns tools (e.g., `search_documents`, `get_pages`, `get_chunks`) based on the requested mode.
2. **Streaming:** Implemented via `/api/v1/completions/stream` using `StreamingResponse`. The `SearchFlowService` uses custom token parsing logic to extract the `response` content from the JSON-structured output of the CrewAI process in real-time.
3. **MCP Integration:** Tools are dynamically discovered and executed via a proxy service (`mcp_service.py`) connecting to an external MCP server over SSE, rather than hardcoding data retrieval logic.
4. **Query Enhancement (HyDE):** The proxy tools incorporate Hypothetical Document Embeddings (HyDE), utilizing a separate agent to generate a hypothetical answer to improve semantic search retrieval accuracy.

## Tracing and Observability
- **Langfuse:** Integrated via `@observe` decorators in services and setup in `main.py` lifespan to trace LLM interactions and agent steps.
- **OpenTelemetry:** Configured for instrumentation of CrewAI, LiteLLM, and other core dependencies.
