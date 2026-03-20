# Search Flow Architecture & Mode Selection

This diagram illustrates how a user request is processed, focusing on how the `mode` parameter drives tool assignment, prompt configuration (Rules & Core Job), and the internal execution flow.

```mermaid
 flowchart TD
    %% Define Styles
    classDef userReq fill:#f9f,stroke:#333,stroke-width:2px;
    classDef service fill:#bbf,stroke:#333,stroke-width:2px;
    classDef decision fill:#ff9,stroke:#333,stroke-width:2px;
    classDef tools fill:#dfd,stroke:#333,stroke-width:2px;
    classDef agent fill:#fbb,stroke:#333,stroke-width:2px;
    classDef external fill:#eee,stroke:#333,stroke-width:2px;
    classDef config fill:#fff,stroke:#333,stroke-dasharray: 5 5;

    %% Flow Start
    User(["User API Request"]):::userReq
    Router["FastAPI Router\n/completions/stream"]:::service
    FlowService["SearchFlowService"]:::service
    Reporter["FlowStatusReporter\n(SSE Status Updates)"]:::service
    CrewFlow["SearchCrewFlow"]:::service

    User -->|"query, mode, context"| Router
    Router --> FlowService
    FlowService -->|"Initialize State & Reporter"| CrewFlow
    CrewFlow -- "report()" --> Reporter
    Reporter -- "SSE: {type: 'status'}" --> User

    CrewFlow --> PrepareContext["Prepare Context Block\n(History + Attachments)"]
    PrepareContext --> CheckMode{"Check Request Mode"}:::decision

    %% Mode Branches & Prompt Config
    CheckMode -->|"mode: 'auto'"| ModeAuto["ModePromptConfig (auto)\nAssign All Tools"]:::tools
    CheckMode -->|"mode: 'search'"| ModeSearch["ModePromptConfig (search)\nAssign Search Tool"]:::tools
    CheckMode -->|"mode: 'lookup'"| ModeLookup["ModePromptConfig (lookup)\nAssign Lookup Tools"]:::tools
    CheckMode -->|"mode: 'chat'"| ModeChat["ModePromptConfig (chat)\nNo Tools"]:::tools

    %% Specific Tool Assignments & Internal Logic
    ModeAuto -.-> ToolSearch
    ModeAuto -.-> ToolPages
    ModeAuto -.-> ToolChunks

    ModeSearch -.-> ToolSearch["proxy_search_documents\n(HyDE Enhanced)"]:::tools
    
    subgraph ToolInternal ["Tool Implementation Details"]
        ToolSearch --> HyDE["generate_hyde_answer\n(Hypothetical Answer)"]:::config
        HyDE --> MCP_Search["execute_mcp_operation\n('search_documents')"]:::external
    end

    ModeLookup -.-> ToolPages["proxy_get_pages"]:::tools
    ModeLookup -.-> ToolChunks["proxy_get_chunks"]:::tools

    ModeChat -.-> NoTools["Direct LLM Response\n(Rules: SCB TechX Domain)"]:::tools

    %% Agent Execution
    ModeAuto & ModeSearch & ModeLookup & ModeChat --> CreateAgent["Create Search Agent\n& Mode-Specific Task"]:::agent
    CreateAgent --> Kickoff["Crew.kickoff_async()"]:::agent

    %% External Interactions
    Kickoff <--> |"MCP over SSE"| MCP["Embedding Service\n(@services/embedding-service)"]:::external
    Kickoff <--> |"LiteLLM"| LLM["Azure OpenAI\n(gpt-4o)"]:::external

    %% Response
    Kickoff --> Stream["Token Parsing Loop\n(_handle_token)"]:::service
    Stream -- "SSE: {type: 'token'}" --> User
    Stream -- "SSE: {type: 'result'}" --> User
```
