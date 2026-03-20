# Search Flow Architecture & Mode Selection

This diagram illustrates how a user request is processed, and specifically how the `mode` parameter determines which MCP tools are assigned to the CrewAI Agent.

```mermaid
 flowchart TD
    %% Define Styles
    classDef userReq fill:#f9f,stroke:#333,stroke-width:2px;
    classDef service fill:#bbf,stroke:#333,stroke-width:2px;
    classDef decision fill:#ff9,stroke:#333,stroke-width:2px;
    classDef tools fill:#dfd,stroke:#333,stroke-width:2px;
    classDef agent fill:#fbb,stroke:#333,stroke-width:2px;
    classDef external fill:#eee,stroke:#333,stroke-width:2px;

    %% Flow Start
    User(["User API Request"]):::userReq
    Router["FastAPI Router\n/completions/stream"]:::service
    FlowService["SearchFlowService"]:::service
    CrewFlow["SearchCrewFlow"]:::service

    User -->|"query, mode, context"| Router
    Router --> FlowService
    FlowService -->|"Initialize State"| CrewFlow

    CrewFlow --> PrepareContext["Prepare Chat History\n& File Attachments"]
    PrepareContext --> CheckMode{"Check Request Mode"}:::decision

    %% Mode Branches
    CheckMode -->|"mode: 'auto'"| ModeAuto["Assign All Tools"]:::tools
    CheckMode -->|"mode: 'search'"| ModeSearch["Assign Document Search Tool"]:::tools
    CheckMode -->|"mode: 'lookup'"| ModeLookup["Assign Content Lookup Tools"]:::tools
    CheckMode -->|"mode: 'chat'"| ModeChat["No External Tools"]:::tools

    %% Specific Tool Assignments
    ModeAuto -.-> ToolSearch["search_documents\n(MCP Proxy)"]
    ModeAuto -.-> ToolPages["get_pages\n(MCP Proxy)"]
    ModeAuto -.-> ToolChunks["get_chunks\n(MCP Proxy)"]

    ModeSearch -.-> ToolSearch

    ModeLookup -.-> ToolPages
    ModeLookup -.-> ToolChunks

    ModeChat -.-> NoTools["Direct Conversation Only"]

    ToolSearch:::tools
    ToolPages:::tools
    ToolChunks:::tools
    NoTools:::tools

    %% Agent Execution
    ToolSearch & ToolPages & ToolChunks & NoTools --> CreateAgent["Create Search Agent\nwith Assigned Tools"]:::agent
    CreateAgent --> Kickoff["Kickoff Agent Execution"]:::agent

    %% External Interactions
    Kickoff <--> |"Retrieve Knowledge"| MCP["External MCP Server\n(SSE)"]:::external
    Kickoff <--> |"LLM Inference"| LLM["Azure OpenAI\n(via LiteLLM)"]:::external

    %% Response
    Kickoff --> Stream["Stream Tokens / Response"]:::service
    Stream --> User
```
