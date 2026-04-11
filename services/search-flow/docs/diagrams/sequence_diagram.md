# Search Flow Sequence Diagram

This diagram illustrates the detailed sequence of operations when a streaming request is made to the Search Flow service, showing the interaction between the backend, the CrewAI flow, the external MCP tools (directly provided by the Embedding Service), and the LLM.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client App (@apps/web)
    participant Backend as @apps/backend
    participant Router as Search Router<br/>(src.routers.search)
    participant Service as SearchFlowService<br/>(src.services.search_service)
    participant CrewFlow as SearchCrewFlow<br/>(src.services.crew.flow)
    participant MCP as MCP Proxy Tools<br/>(src.services.crew.tools.proxies)
    participant Embedding as @services/embedding-service
    participant LLM as Azure OpenAI

    Client->>Backend: POST /api/v1/completions/stream
    Backend->>Router: POST /api/v1/completions/stream (SearchChatRequest)
    
    Router->>Service: execute_workflow_stream(request)
    Service->>Service: Initialize event_queue (asyncio.Queue)
    Service->>CrewFlow: SearchCrewFlow(step_callback)
    
    par Flow Execution Task
        Service->>CrewFlow: kickoff_async(inputs)
        activate CrewFlow
        
        CrewFlow->>CrewFlow: execute_flow() [@start]
        
        Note over CrewFlow,Service: Service.report_status("Analyzing request...")
        Service-->>Router: Yield SSE event: {"type": "status", "content": "..."}
        
        CrewFlow->>MCP: get_proxy_tools(status_callback)
        CrewFlow->>CrewFlow: _build_context_block() (Context & History)
        
        CrewFlow->>CrewFlow: create_search_agent() & create_task()
        
        CrewFlow->>LLM: Crew.kickoff_async() (Initialize Agent Loop)
        
        rect rgb(240, 248, 255)
            note right of CrewFlow: Agent Execution Loop (Multi-turn)
            CrewFlow->>LLM: Send Prompt (Thought)
            LLM-->>CrewFlow: Request Tool Call (Action: proxy_search_documents)
            
            CrewFlow->>MCP: search_documents(query)
            
            rect rgb(255, 250, 240)
                note right of MCP: Query Enhancement (HyDE)
                MCP->>LLM: generate_hyde_answer(query)
                LLM-->>MCP: Hypothetical Answer
            end
            
            MCP->>Embedding: execute_mcp_operation("search_documents", params) [via SSE]
            Embedding-->>MCP: Return JSON Chunks / Metadata
            MCP-->>CrewFlow: Observation (Search results)
            
            CrewFlow->>LLM: Analyze results & summarize
        end
        
        LLM-->>CrewFlow: Final Answer Generation (Streaming Tokens)
        
        loop Token Parsing
            CrewFlow-->>Service: Yield StreamChunk (JSON fragment)
            Service->>Service: _handle_token(raw) [Extract "response" field]
            Service-->>Router: Yield SSE event: {"type": "token", "content": "..."}
        end

        CrewFlow-->>Service: Final FlowResponse (Pydantic)
        deactivate CrewFlow
        
        Service-->>Router: Yield SSE event: {"type": "result", "content": {...}}
        Service-->>Router: Close Stream (None)
    end
    
    Router-->>Backend: HTTP 200 (text/event-stream)
    Backend-->>Client: Streamed Response
```
