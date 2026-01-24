# AI Engine Service

AI Engine service with CrewAI reasoning and autonomous RAG retrieval.

## Features

- Multi-agent reasoning using CrewAI
- Support for multiple LLM providers (OpenAI, Anthropic, Google AI)
- Autonomous RAG retrieval through Embedding Service API
- Intelligent query routing based on user intent

## Development

```bash
# Install dependencies
uv sync

# Run development server
source .venv/bin/activate && uvicorn main:app --reload --port 8001
```
