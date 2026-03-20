# Search Flow Sequence Diagram

This diagram illustrates the sequence of operations when a streaming request is made to the Search Flow service, showing the interaction between the backend, the CrewAI flow, the external MCP tools, and the LLM.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client App (@apps/web)
    participant Backend as @apps/backend
    participant Router as Search Router
    participant Service as SearchFlowService
    participant CrewFlow as SearchCrewFlow
    participant MCP as MCP Proxy Tools
    participant Embedding as @services/embedding-service
    participant LLM as Azure OpenAI

    Client->>Backend: POST /api/v1/completions/stream
    Backend->>Router: POST /api/v1/completions/stream (SearchChatRequest)
    Router->>Service: execute_workflow_stream()
    Service->>CrewFlow: kickoff_async(inputs)
    
    activate CrewFlow
    CrewFlow->>CrewFlow: Prepare Context & History
    CrewFlow->>MCP: Load Dynamic Tools via MCP
    CrewFlow->>LLM: Initialize Agent & Task
    
    rect rgb(245, 245, 255)
        note right of CrewFlow: Agent Execution Loop
        CrewFlow->>LLM: Send Prompt to Agent (Thought)
        LLM-->>CrewFlow: Request Tool Execution (Action)
        
        CrewFlow->>MCP: Call Tool (e.g., proxy_search_documents)
        MCP->>Embedding: call_tool via MCP SSE
        Embedding-->>MCP: Return Chunks / Pages data
        MCP-->>CrewFlow: Send Observation to Agent
        
        CrewFlow->>LLM: Analyze Data & Summarize
        LLM-->>CrewFlow: Final Answer Generation
    end
    
    CrewFlow-->>Service: Yield StreamChunk / Output
    deactivate CrewFlow
    
    Service-->>Router: Parse and emit SSE Events (Tokens)
    Router-->>Backend: HTTP 200 Chunked (text/event-stream)
```
