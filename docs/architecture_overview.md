# AINGO System Architecture Overview

This document provides a deep-dive architectural overview of the AINGO monorepo. AINGO is an AI-powered document search system that enables intelligent retrieval, reasoning, and interaction with uploaded documents through a web chat interface.

This guide is designed for new engineering joiners to quickly digest the ecosystem, services, data flows, and tech stacks.

---

## 1. Executive Summary

AINGO follows a modern **microservices architecture** built around a centralized **AI Orchestrator Pattern**. The system handles intelligent document processing (ingestion, OCR, chunking), vectorized semantic search, and multi-agent LLM reasoning to provide highly accurate, contextual answers.

Every service runs in isolated containers (managed via Docker Compose) and communicates over REST APIs or asynchronous message queues, ensuring scalability and fault tolerance.

---

## 2. Platform Infrastructure

The product is orchestrated using Docker Compose, establishing several bounded-context databases and proxies.

### Core Ecosystem Components
- **Message Broker**: **RabbitMQ** (Used by the File Storage Service to emit asynchronous events when uploaded files are ready for data ingestion).
- **Qdrant Vector Database**: Ultra-fast multidimensional vector store facilitating accurate context retrieval for the AI Engine.
- **Object Storage**: **MinIO** (S3-compatible storage retaining raw documents and ingestion artifacts).
- **Relational Databases**: **SQLite** (Used natively by specific services like the Backend gateway and File Storage Service for metadata, state tracking, and session histories).

---

## 3. Service Breakdown

The monorepo contains 8 major services categorized by their bounded contexts.

### 3.1 Frontend (`apps/web`)
- **Role**: The user-facing chat and interaction layer.
- **Tech Stack**: Next.js 15, React 19, TailwindCSS 4, GSAP/Motion for animations.
- **Responsibilities**: Renders the conversation interface, handles user authentication states, and communicates exclusively with the Backend Gateway.

### 3.2 Backend API Gateway (`apps/backend`)
- **Role**: The central orchestrator, API Gateway, and session manager.
- **Tech Stack**: NestJS (TypeScript), SQLite + Drizzle ORM, Passport (JWT).
- **Responsibilities**:
  - Secure entry point for all frontend requests.
  - Maintains session states and conversation histories natively in SQLite.
  - Forwards chat messages to the AI Engine (`search-flow`) and document uploads to the ingestion pipelines.

### 3.3 Search Flow / AI Engine (`services/search-flow`)
- **Role**: The core multi-agent reasoning engine.
- **Tech Stack**: Python (FastAPI), CrewAI, Langfuse (for LLM observability).
- **Responsibilities**:
  - Receives user queries and conversation history from the Backend.
  - Orchestrates complex reasoning tasks using autonomous CrewAI agents:
    - **Orchestrator Agent**: Analyzes intent (General Query vs. Document Search) and routes requests.
    - **RAG Analyzer Agent**: Extracts search intents, automatically generates optimal search queries, and calls the Embedding Service to retrieve documents.
    - **Chat Responder Agent**: Synthesizes the retrieved context and generates the final natural-language response.

### 3.4 Data Ingestion Pipeline (`services/data-ingestion`)
- **Role**: The ETL pipeline that transforms raw unstructured files into searchable vector embeddings.
- **Tech Stack**: Python (FastAPI, RQ/Celery background workers).
- **Responsibilities**:
  - **Reading & Modality Detection**: Classifies content on a page-by-page basis (Text, PDF, Image, Table).
  - **Extraction**: Dispatches jobs to OCR, Vision APIs, or pure text extractors based on the detected modality.
  - **Chunking**: Hierarchically chunks files and summarizes the content.
  - **Vectorization**: Sends the optimal chunks to the Embedding Service to generate vectors.

### 3.5 Embedding Service (`services/embedding-service`)
- **Role**: The single point of contact for the vector space.
- **Tech Stack**: Python (FastAPI), Qdrant Vector DB.
- **Responsibilities**:
  - Computes vector embeddings from raw chunks.
  - Stores vectors and mathematical metadata natively in Qdrant (Database-per-service pattern).
  - Provides semantic search APIs (cosine similarity) and performs integrated **reranking** to drastically improve retrieval precision.

### 3.6 File Storage Service (`services/file-storage-service`)
- **Role**: Content management and workflow state tracking.
- **Tech Stack**: Python (FastAPI), SQLModel (SQLite), Boto3 (MinIO).
- **Responsibilities**:
  - Handles the physical file upload streams directly into MinIO.
  - Tracks file lifecycle states (`PENDING` -> `PROCESSING` -> `COMPLETED` -> `INDEXING`).
  - Emits asynchronous RabbitMQ events once files are successfully saved.
  - Fires webhooks back to NestJS to keep the UI up-to-date with file statuses.

### 3.7 SharePoint Webhook (`services/sharepoint-webhook`)
- **Role**: The external integration hook for document synchronization.
- **Tech Stack**: Python (FastAPI), Alembic + SQLite.
- **Responsibilities**:
  - Listens to Microsoft SharePoint webhook events.
  - Monitors specific SharePoint folders for additions, mutations, or deletions.
  - Automatically fetches the files from SharePoint and pushes them into the AINGO File Storage / Ingestion pipeline.

### 3.8 MCP Fast (`services/mcp-fast`)
- **Role**: A central hub serving the Model Context Protocol (MCP).
- **Responsibilities**: Serves as a standard interface layer allowing LLMs to seamlessly access unified tools and dynamic contexts across the various internal resources securely.

---

## 4. Key Data Flows

### A. Document Ingestion Flow (Uploads & SharePoint Sync)
1. **Trigger**: User uploads a file (via Frontend → Backend) OR the `sharepoint-webhook` detects a new file.
2. **Storage**: The file data is streamed to the `file-storage-service`, saved in MinIO, and marked as `PROCESSING`. Webhooks inform the Backend of the status.
3. **Queue**: Upon successful MinIO upload, a `file_ready` event is published to RabbitMQ.
4. **ETL Pipeline**: `data-ingestion` consumes the event, detects modalities (text vs images), chunks the document contextually, and sends the chunks to the `embedding-service`.
5. **Vectorization**: The `embedding-service` calculates the embeddings and persists them in Qdrant. The file is finally marked as `INDEXED`.

### B. Intelligent Chat Retrieval Flow (RAG)
1. **Query**: The user asks a question via the Frontend.
2. **Orchestration**: The `backend` retrieves the user's session history and forwards the query to the `search-flow` AI Engine.
3. **Reasoning**: The *Orchestrator Agent* evaluates the user's request. If it senses a document-based question, it hands off to the *RAG Agent*.
4. **Retrieval**: The *RAG Agent* extracts dense keywords and autonomously queries the `embedding-service`.
5. **Search**: The `embedding-service` performs a cosine similarity search in Qdrant, reranks the matched chunks, and returns the highest precision contexts.
6. **Synthesis**: The *Chat Responder Agent* receives the documents, evaluates their relevance, and generates a natural, conversational answer incorporating the retrieved facts.
7. **Response**: The final answer is passed back through the API Gateway to the user's screen.

---

## 5. Technology Stack Summary

| Layer | Primary Technologies |
|---|---|
| **Frontend UI** | Next.js 15, React, TailwindCSS, GSAP |
| **API Gateway & Auth** | NestJS, TypeScript, Passport JWT |
| **AI & Multi-Agent** | Python, FastAPI, CrewAI, Langfuse |
| **Data Pipelines (ETL)** | Python, FastAPI, Boto3, RabbitMQ |
| **Databases** | Qdrant (Vector), SQLite/SQLModel/Drizzle |
| **Infrastructure** | Docker Compose, MinIO |
