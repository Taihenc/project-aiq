# Search Flow System Architecture

This diagram shows the system boundaries and how the stateless Search Flow service interacts with the user-facing backend, the embedding service (acting as the knowledge base), and the Azure OpenAI LLM.

```mermaid
flowchart TD
    %% Define Components
    Client["Client App"]
    Backend["@apps/backend\n(NestJS)"]
    SearchFlow["@services/search-flow\n(FastAPI + CrewAI)\n⚙️ Stateless Orchestrator"]
    Embedding["@services/embedding-service\n(FastAPI + Qdrant)\n🗄️ Vector Knowledge Base"]
    LLM["Azure OpenAI\n(LLM Provider)"]

    %% Define Relationships
    Client -->|HTTP Request| Backend
    Backend -->|POST /api/v1/completions/stream| SearchFlow
    SearchFlow <-->|LLM Inference and Prompting| LLM
    SearchFlow <-->|MCP Protocol over SSE<br/>Discover and Call Tools| Embedding
    
    %% Styling
    classDef client fill:#f5f5f5,stroke:#333,stroke-width:2px;
    classDef backend fill:#e3f2fd,stroke:#0288d1,stroke-width:2px;
    classDef search fill:#f3e5f5,stroke:#8e24aa,stroke-width:2px;
    classDef embed fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef external fill:#fff8e1,stroke:#fbc02d,stroke-width:2px,stroke-dasharray: 5 5;

    class Client client;
    class Backend backend;
    class SearchFlow search;
    class Embedding embed;
    class LLM external;
```
