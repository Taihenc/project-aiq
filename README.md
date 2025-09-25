# project-aiq-mvp

This is a simple MVP (Minimum Viable Product) for a web chat interface with AI integration and a basic RAG (Retrieval Augmented Generation) service.

## Project Structure

```
project-aiq-mvp/
├─ apps/
│  ├─ web/                 # Streamlit chat UI
│  └─ backend/             # NestJS orchestrator API (REST)
├─ services/
│  └─ ai/                  # Python FastAPI service
├─ shared/
│  ├─ contracts/           # OpenAPI/DTOs/types shared between FE/BE
│  └─ env/                 # Example .env templates
├─ docker/                 # (optional) compose & dev helpers
└─ README.md
```

## Getting Started

To start all services (backend, frontend, and AI service) in parallel, run the following command from the root of the monorepo:

```bash
pnpm dev
```

### Backend (NestJS Orchestrator)

The backend service is a NestJS application that acts as an orchestrator between the frontend and the AI service. It does not contain any AI logic itself.

### Frontend (Streamlit)

The frontend is a Streamlit application for the chat user interface.

### AI Service (Python FastAPI)

The AI service is a Python FastAPI application.
