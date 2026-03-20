# Search Flow Class Diagram

This diagram outlines the core data models (Pydantic) and service classes within the Search Flow service, showing how requests are transformed into state and eventually into responses.

```mermaid
classDiagram
    class SearchChatRequest {
        +String query
        +String mode
        +List history
        +String context
        +List~FileRef~ attachments
        +SearchFilter filter
        +Dict metadata
    }

    class FlowState {
        +String query
        +String context
        +List history
        +String mode
        +String title
        +FlowResponse final_response
    }

    class FlowResponse {
        +String title
        +String response
        +List~FileRef~ citations
    }

    class SearchFlowService {
        -_build_search_filter(request) Dict
        +execute_workflow(request) FlowResponse
        +execute_workflow_stream(request) AsyncGenerator
    }

    class SearchCrewFlow {
        +execute_flow()
        -_build_context_block() String
        -_format_history() String
        -_format_context() String
    }

    class Proxies {
        <<module>>
        +generate_hyde_answer(query) String
        +get_proxy_tools() List~BaseTool~
    }

    SearchFlowService ..> SearchChatRequest : Receives
    SearchFlowService --> SearchCrewFlow : Instantiates
    SearchCrewFlow --> FlowState : Manages
    FlowState ..> FlowResponse : Stores
    SearchCrewFlow --> Proxies : Binds Tools
```
