# project-aiq-mvp

## Main Objective

Build an AI-powered document search system that enables intelligent retrieval, reasoning, and interaction with uploaded documents through a web chat interface.

The system integrates five main components — **Frontend** (web chat UI), **Backend** (API Gateway), **AI Engine** (reasoning), **Chat Service** (session management), and **Embedding Service** (document vectorization) — to handle user interaction, routing, LLM reasoning with autonomous RAG retrieval, conversation history, and document search respectively.

---

## Project Structure

```
project-aiq-mvp/
├─ apps/
│  ├─ web/                 # Streamlit chat UI
│  └─ backend/             # NestJS orchestrator API (REST)
├─ services/
│  ├─ ai-engine/           # AI Engine (CrewAI reasoning, reranker)
│  ├─ chat-service/        # Chat Service (session & history)
│  └─ embedding-service/   # Embedding Service (chunking, embedding, Qdrant)
├─ docker-compose.yml
└─ README.md
```

## Getting Started

To start all services (backend, frontend, AI Engine, Chat Service, Embedding Service) in parallel, run the following command from the root of the monorepo:

```bash
pnpm i -r
pnpm dev
```

## System Architecture Overview

### 1. Frontend (Streamlit)

The frontend is a Streamlit application for the chat user interface.

**Technology:** Python, Streamlit

**Location:** `apps/web/`

---

### 2. Backend (NestJS Orchestrator)

The backend service is a NestJS application that acts as an orchestrator between the frontend and the AI Engine, Chat Service, and Embedding Service. It does not contain any AI logic itself.

**Technology:** NestJS (TypeScript)

**Location:** `apps/backend/`

---

### 3. AI Engine
**Purpose:**  
Handles LLM reasoning and orchestration using CrewAI with autonomous RAG retrieval through internal API calls.

**Responsibilities:**
- Process chat completion requests using multi-agent reasoning (CrewAI)
- Support multiple LLM providers (OpenAI, Anthropic, Google AI, Ollama)
- Route queries intelligently based on user intent
- Request document retrieval via Embedding Service API.
- Generate natural, contextually appropriate responses in the language user asks

**Router Endpoints:**
- `POST /v1/ai-engine/chat/completions` → Chat completion with agent reasoning

**Supported Providers:**
- OpenAI
- Anthropic
- Google AI
- Ollama

**AI Engine Architecture:**

The service uses a 4-component system with specialized roles:

1. **Orchestrator Agent**
   - Analyzes user queries using LLM reasoning
   - Determines query intent (document search vs general chat)
   - Routes queries to appropriate agents
   - Coordinates workflow between RAG Analyzer and Chat Responder
   - Extensible for future agent types

2. **RAG Analyzer Agent**
   - Generates optimal search keywords for retrieval
   - Calls Embedding Service via HTTP API
   - Receives similarity scores for retrieved documents
   - Sends documents to Reranker for refinement
   - Evaluates result relevance to avoid returning unrelated files
   - Passes relevant context to Chat Responder

3. **Reranker**
   - Component within Agent Service (not a separate service)
   - Reranks documents based on query-document relevance
   - Improves precision of retrieval results
   - Filters out less relevant documents
   - Optimizes result ordering for better context quality

4. **Chat Responder Agent**
   - Receives context from other agents (RAG results or conversation history)
   - Synthesizes information into coherent responses
   - Generates natural, conversational answers in the language user asks
   - Maintains tone appropriate to query context

**Key Features:**
- **Intelligent Query Routing:** LLM-based intent detection by Orchestrator
- **Autonomous RAG:** internal API integration for document retrieval
- **Context-Aware Responses:** Agents collaborate to provide relevant answers
- **Natural Language:** Generates conversational responses without technical jargon

**Technology:** Python FastAPI, CrewAI

**Location:** `services/ai-engine/`

---

### 4. Chat Service
**Purpose:**  
Manages user chat sessions and conversation history.

**Responsibilities:**
- Manage user sessions and conversation history
- Store and retrieve chat messages per session
- Call AI Engine for response generation
- Track conversation continuity
- Provide context to AI Engine from previous conversations

**Router Endpoints:**
1. `POST /chat` → Send and receive chat messages
2. `GET /get-history` → Retrieve previous chat history
3. `POST /create-session` → Initialize a new user chat session
4. `GET /check-session` → Validate or retrieve active session state

**Technology:** Python FastAPI

**Location:** `services/chat-service/`

---

### 5. Embedding Service
**Purpose:**  
Handles document processing, vector embedding operations, and document search.

**Responsibilities:**
- Chunk documents for optimal retrieval
- Generate and store text embeddings from OCR or raw text
- Perform similarity search using distance metrics (cosine similarity)
- Manage document metadata and CRUD operations
- Own and manage Qdrant vector database (database per service pattern)

**Router Endpoints:**
1. `POST /upload` → Receive, chunk, embed, and store documents
2. `POST /search` → Compute vector distance for document retrieval
3. `GET /documents` → List or fetch available document metadata
4. `POST /query` → Query via metadata or other structured filters
5. `DELETE /delete` → Remove document by ID
6. `PUT /edit` → Update existing document metadata or embedding
7. `GET /get/:id` → Fetch document directly by ID

**Key Design Principle:**
- Embedding Service is the **sole owner** of Qdrant DB
- Other services **must not** access Qdrant directly
- All vector operations go through Embedding Service APIs

**Technology:** Python FastAPI, Qdrant

**Location:** `services/embedding-service/`

---

## Architecture Diagrams

### Container Diagram (C4 Level 2)

```mermaid
graph TD
    %% LAYER: Frontend & Backend
    U[User <br/> <small>Frontend</small>]
    B[Backend API Gateway<br/><small>Routing · Auth · Logging</small>]

    %% LAYER: Services
    C[Chat Service<br/><small>Session · History · Context</small>]
    A[AI Engine<br/><small>Orchestrator · RAG Analyzer · Reranker · Responder</small>]
    R[Embedding Service<br/><small>Chunker · Embedding · Vector Search</small>]

    %% CONNECTIONS
    U --> B
    B --> C
    B --> R
    C --> A
    A --> R

    %% STYLE
    style U fill:#e1e4e8,stroke:#586069,stroke-width:2px,color:#24292e
    style B fill:#d1ecf1,stroke:#17a2b8,stroke-width:2px,color:#212529
    style C fill:#fff,stroke:#fd7e14,stroke-width:2px,color:#24292e
    style A fill:#fff,stroke:#0366d6,stroke-width:2px,color:#24292e
    style R fill:#fff,stroke:#28a745,stroke-width:2px,color:#24292e
```

---

### Document Retrieval Flow

```mermaid
sequenceDiagram
    autonumber
    box Client Layer
        participant User as 🧑‍💻 User (Frontend)
    end

    box Gateway Layer
        participant Backend as 🌐 Backend (API Gateway)
    end

    box Chat Service
        participant Chat as 💬 Chat Service
    end

    box AI Engine
        participant Orch as 🧩 Orchestrator Agent
        participant Rag as 🔍 RAG Analyzer Agent
        participant Rerank as ⚖️ Reranker
        participant Responder as 💡 Chat Responder Agent
    end

    box Embedding Service
        participant Retrieval as 📚 Retrieval Module
        participant Qdrant as 🗂️ Qdrant DB
    end


    %% USER SEND MESSAGE
    User->>Backend: POST /api/chat {session_id, message}
    Backend->>Chat: POST /chat {session_id, message}

    %% CHAT LOAD HISTORY
    Chat->>Chat: Load session + history from DB
    Chat->>Orch: POST /ai-engine/chat/completions {message, history[]}

    %% ORCHESTRATOR
    Orch->>Orch: Analyze intent (Chat / RAG)

    alt Query requires retrieval
        Orch->>Rag: Forward query for retrieval analysis
        Rag->>Retrieval: POST /search {query_text}
        Retrieval->>Qdrant: vector search (cosine similarity)
        Qdrant-->>Retrieval: top-K documents + scores
        Retrieval-->>Rag: relevant_docs[]
        Rag->>Rerank: Send docs for reranking
        Rerank-->>Rag: top-ranked docs
        Rag-->>Responder: relevant context
    else Simple chat
        Orch->>Responder: Forward message directly
    end

    %% RESPONDER GENERATES FINAL ANSWER
    Responder->>Responder: Generate final response (LLM)
    Responder-->>Chat: {answer, context}

    %% CHAT SERVICE SAVES HISTORY
    Chat->>Chat: Save message + response to session DB
    Chat-->>Backend: response {answer}

    %% RETURN TO USER
    Backend-->>User: Return final message
```

---

### Document Upload Flow

```mermaid
sequenceDiagram
    autonumber
    box Client Layer
        participant User as 🧑‍💻 User (Frontend)
    end

    box Gateway Layer
        participant Backend as 🌐 Backend (API Gateway)
    end

    box Embedding Service
        participant Retrieval as 📚 Retrieval Module
        participant Chunker as ✂️ Document Chunker
        participant Embedder as 🧠 Embedding Generator
        participant Qdrant as 🗂️ Qdrant DB
    end

    %% USER UPLOADS DOCUMENT
    User->>Backend: POST /api/upload {file, metadata}
    Backend->>Retrieval: POST /upload {file, metadata}

    %% RETRIEVAL PROCESSES DOCUMENT
    Retrieval->>Chunker: Split document into chunks
    Chunker-->>Retrieval: chunks[]

    Retrieval->>Embedder: Generate embeddings for chunks
    Embedder-->>Retrieval: embeddings[]

    Retrieval->>Qdrant: Store chunks + embeddings + metadata
    Qdrant-->>Retrieval: Confirmation {document_id}

    %% RETURN TO USER
    Retrieval-->>Backend: Success {document_id, chunks_count}
    Backend-->>User: Upload successful
```

---

## Data Flow Summary

### Chat Flow
1. **User(Frontend) sends query** → Backend (API Gateway)
2. **Backend routes** → Chat Service
3. **Chat Service** → loads session/history → forwards to AI Engine
4. **Orchestrator Agent** → analyzes query intent using LLM reasoning
5. **Route decision:**
   - If document search needed → RAG Analyzer calls Embedding Service via HTTP API
   - Retrieval queries Qdrant vector database
   - RAG Analyzer passes results to Reranker for refinement
   - If general chat → directly to Chat Responder
6. **Chat Responder** → synthesizes context and generates response
7. **Response stored** → Chat Service logs conversation in session
8. **Backend returns** → final response to User(Frontend)

### Upload Flow
1. **User(Frontend) uploads document** → Backend (API Gateway)
2. **Backend routes** → Embedding Service
3. **Embedding Service:**
   - Chunks document into optimal segments
   - Generates embeddings for each chunk
   - Stores chunks + embeddings + metadata in Qdrant
4. **Confirmation returned** → Backend → User(Frontend)

---

## Expected Capabilities

- Semantic document search via embeddings with cosine similarity
- Result reranking for improved retrieval precision
- Intelligent query routing via Orchestrator agent
- Autonomous RAG retrieval through Embedding Service via HTTP API
- Natural language reasoning using multi-agent system (CrewAI)
- Multi-turn chat with memory (session-based)
- Multilingual support (Thai-English)
- Support for multiple LLM providers (OpenAI, Anthropic, Google AI, Ollama)
- Able to find relationships between documents and perform sequential document retrieval (e.g., Document1 finds Document2, then Document2 uses context to find Document3)
- Document chunking and metadata management
- Database per service pattern (Embedding Service owns Qdrant)

---

## Example Workflows

### Example 1: Document Search Query
1. User(Frontend) asks: "README ของ AI service อยู่ที่ไหน?"
2. Backend routes to Chat Service
3. Chat Service loads history and forwards to AI Engine
4. **Orchestrator Agent** analyzes → detects document search intent
5. Routes to **RAG Analyzer Agent**
6. RAG Analyzer generates keywords → calls Embedding Service via API
7. Embedding Service queries Qdrant → retrieves relevant documents with similarity scores
8. RAG Analyzer sends results to **Reranker** → refines and reorders results
9. RAG Analyzer evaluates relevance → passes context to Chat Responder
10. **Chat Responder** generates detailed answer with source information
11. Response returned to Chat Service and stored in session
12. Backend returns response to User(Frontend)

### Example 2: General Knowledge Query
1. User(Frontend) asks: "มี service อะไรบ้างในระบบ?"
2. Backend routes to Chat Service
3. Chat Service forwards to AI Engine
4. **Orchestrator Agent** analyzes → detects potential document search
5. Routes to **RAG Analyzer Agent**
6. RAG Analyzer calls Embedding Service → searches embeddings → finds related documents
7. RAG Analyzer sends to **Reranker** → improves result ordering
8. Passes refined results to **Chat Responder**
9. Chat Responder synthesizes information about available services
10. Natural response mentioning AI Engine, Chat Service, Embedding Service, and Backend services
11. Response stored and returned to User(Frontend)

### Example 3: Conversational Query
1. User(Frontend) says: "ขอบคุณครับ"
2. Backend routes to Chat Service with conversation history
3. Chat Service forwards to AI Engine
4. **Orchestrator Agent** analyzes → detects casual conversation (no document search needed)
5. Routes directly to **Chat Responder Agent**
6. Chat Responder generates natural conversational response
7. Efficient processing without unnecessary document retrieval
8. Response returned to User(Frontend)

---