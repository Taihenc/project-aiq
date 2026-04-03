# Search Flow Service

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![CrewAI](https://img.shields.io/badge/CrewAI-1.9.3+-FF9900.svg)](https://crewai.com/)

A powerful microservice for orchestrating complex, multi-agent search workflows using CrewAI and FastAPI.

<div align="center">

[Overview](#overview) •
[Features](#features) •
[Architecture](#architecture) •
[Documentation](#documentation) •
[Getting Started](#getting-started) •
[Usage](#usage)

</div>

## Overview

The **Search Flow Service** provides a structured way to answer user queries by orchestrating AI agents. It integrates external knowledge bases via the Model Context Protocol (MCP) and streams real-time responses using Server-Sent Events (SSE). It's designed as the intelligence engine behind an enterprise search experience, seamlessly combining conversational history, context, and dynamic data retrieval tools.

## Features

- 🤖 **Agentic Orchestration:** Uses CrewAI to manage stateful agent workflows, dynamically assigning tools based on the query "mode" (`auto`, `search`, `lookup`, `chat`).
- ⚡ **Real-time Streaming:** Implements custom token parsing to stream LLM responses in real-time (`text/event-stream`).
- 🔌 **Dynamic Tools via MCP:** Connects to Model Context Protocol (MCP) servers to discover and execute data retrieval tools (`search_documents`, `get_pages`, `get_chunks`) rather than hardcoding them.
- 🎯 **Advanced Retrieval:** Supports Hypothetical Document Embeddings (HyDE) to enhance search accuracy by generating synthetic answers prior to querying.
- 📊 **Deep Observability:** Integrated with Langfuse and OpenTelemetry for comprehensive tracing of LLM calls, agent reasoning, and system performance.
- 🏗️ **Clean Architecture:** Built with FastAPI, Pydantic, and strictly separated service layers.

## Architecture

This service orchestrates the flow from API request to agent execution.

```text
Request ➔ FastAPI Router ➔ SearchFlowService ➔ SearchCrewFlow ➔ Agent Execution
                                                                        ⬇
Response ⬅ Streaming Parser ⬅ CrewAI Result ⬅ Tools (MCP Server) ⬅ LLM (Azure OpenAI)
```

The core logic revolves around `SearchCrewFlow`, which prepares the context (chat history, user attachments) and dynamically injects MCP-based tools into the AI agent's environment before kickoff.

## Documentation

Detailed architectural and system diagrams can be found in the [docs/](docs/) directory:

- **[System Architecture](docs/diagrams/system_architecture.md)**: High-level overview of the service components and their interactions.
- **[Mode Architecture](docs/diagrams/mode_architecture.md)**: Details on how different search modes (`auto`, `search`, etc.) are handled.
- **[Sequence Diagram](docs/diagrams/sequence_diagram.md)**: Step-by-step flow of a search request.
- **[Class Diagram](docs/diagrams/class_diagram.md)**: Overview of the internal code structure and relationships.

## Getting Started

### Prerequisites

> [!NOTE]
> It is highly recommended to use [uv](https://github.com/astral-sh/uv) as your Python package manager for faster dependency resolution.

- Python 3.11 to 3.13
- Redis (for caching/infrastructure support)
- MongoDB (for internal state/tracking if enabled)

### Installation

1. Clone the repository and navigate to the `search-flow` directory.
2. Install the project dependencies using `uv`:

```bash
uv run python client.py
```

### Configuration

> [!IMPORTANT]
> You must configure your environment before running the application.

Create a `.env` file in the root directory (refer to `.env.example` if available). At a minimum, you will need:

```env
ENVIRONMENT=development
DEBUG=true

# Model Configuration
AZURE_API_KEY=your_azure_api_key
AZURE_API_BASE=your_azure_endpoint
AZURE_API_VERSION=2024-02-15-preview
AZURE_MODEL_NAME=gpt-4o

# External Services
MCP_SERVER_URL=http://localhost:8003/v1/mcp/sse
EMBEDDING_SERVICE_URL=http://localhost:8003
```

## Usage

### Running the Service

Start the FastAPI development server:

```bash
uv run python src/main.py
```

The service will start on the default Uvicorn port (usually `http://127.0.0.1:8000`).

### API Endpoints

The service exposes the following main routes under `/api/v1/`:

- **POST `/api/v1/completions`**: Synchronous search execution. Returns the final response after the entire agent workflow completes.
- **POST `/api/v1/completions/stream`**: Asynchronous streaming endpoint. Returns server-sent events as the agent parses data and streams tokens back to the client.

**Example Request Payload:**
```json
{
  "query": "How do I configure the server?",
  "mode": "auto",
  "history": [],
  "context": "User provided config.yml file..."
}
```

## Built With

- **[FastAPI](https://fastapi.tiangolo.com/)**: High performance web framework.
- **[CrewAI](https://crewai.com/)**: Multi-agent framework for complex task orchestration.
- **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/)**: Open standard for connecting AI to data sources.
- **[LiteLLM](https://litellm.vercel.app/)**: Simplified interface to Azure OpenAI and API models.
- **[Langfuse](https://langfuse.com/)**: LLM engineering and observability platform.
