# Deployment Guide

## Prerequisites

- Docker & Docker Compose v2+
- Azure OpenAI API credentials (for search-flow)
- `.env` files configured for each service (see `.env.example` in each service directory)

## Quick Start

### 1. Configure environment files

Copy the example files to create actual `.env` files for each service:

```bash
# Core services
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env

# AI services
cp services/search-flow/.env.example services/search-flow/.env
cp services/embedding-service/.env.example services/embedding-service/.env

# Ingestion & storage
cp services/data-ingestion/.env.example services/data-ingestion/.env
cp services/file-storage-service/.env.example services/file-storage-service/.env

# Integration
cp services/sharepoint-webhook/.env.example services/sharepoint-webhook/.env
```

### 2. Edit critical environment variables

Before starting, ensure the following are set appropriately in the `.env` files:

- **apps/backend/.env**: Set a strong `JWT_SECRET` (for production) and adjust `CORS_ORIGINS` if needed.
- **services/search-flow/.env**: Provide Azure credentials (`AZURE_API_KEY`, `AZURE_API_BASE`, `AZURE_API_VERSION`, `AZURE_MODEL_NAME`). Optional: tweak crew and search parameters.
- **services/sharepoint-webhook/.env**: Set SharePoint credentials (`TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_NAME`, `SITE_NAME`) if using SharePoint integration. Also configure `TUNNEL_TYPE` and `CLOUDFLARE_TUNNEL_URL` if exposing externally.
- **services/file-storage-service/.env**: The defaults work with MinIO; override only if using external S3.
- Other services can use the provided defaults for local development.

### 3. Build and start all services

```bash
docker compose up --build -d
```

This will build images and start all containers in the background.

### 4. Verify that services are healthy

```bash
# Core API
curl -f http://localhost:3000/health   # backend

# Frontend UI (serves Next.js app)
curl -f http://localhost:3001         # web

# AI Engine
curl -f http://localhost:8000/        # search-flow

# Support services
curl -f http://localhost:8003/health  # embedding-service
curl -f http://localhost:8002/health  # data-ingestion
curl -f http://localhost:8004/docs    # sharepoint-webhook (FastAPI docs)
curl -f http://localhost:8007/docs    # file-storage-service (host port 8007)

# Infrastructure
curl -f http://localhost:9000/minio/health/live  # MinIO
curl -f http://localhost:6333/health             # Qdrant
```

The web UI should be accessible at [http://localhost:3001](http://localhost:3001).

### 5. Stopping the stack

```bash
docker compose down
```

To also remove persistent volumes (deletes all data):

```bash
docker compose down -v
```

## Service Ports

The following ports are published to the host. Ensure they are not used by other applications.

| Service                | Container Port | Host Port | Description                                |
|------------------------|----------------|-----------|--------------------------------------------|
| backend                | 3000           | 3000      | API gateway (NestJS)                       |
| web                    | 3001           | 3001      | Frontend UI (Next.js)                      |
| search-flow            | 8000           | 8000      | AI search orchestration (CrewAI)           |
| embedding-service      | 8003           | 8003      | Embedding + Qdrant proxy                   |
| data-ingestion         | 8002           | 8002      | Document ingestion                         |
| sharepoint-webhook     | 8004           | 8004      | SharePoint integration webhook             |
| file-storage-service   | 8004           | 8007      | File storage & metadata API                |
| aingo-minio            | 9000, 9001     | 9000,9001 | S3-compatible object storage (API & console) |
| rabbitmq               | 5672, 15672    | 5672,15672| Message broker (AMQP & management UI)     |
| qdrant                 | 6333, 6334     | 6333,6334 | Vector database (REST & dashboard)        |

**Note:** The file-storage-service container uses port 8004 internally; the host maps it to port 8007 to avoid conflict with sharepoint-webhook.

## Environment Variables Overview

### Backend (`apps/backend/.env`)

| Variable              | Required | Default / Example                     | Description                          |
|-----------------------|----------|---------------------------------------|--------------------------------------|
| `NODE_ENV`            | no       | `development`                        | Runtime environment                  |
| `PORT`                | no       | `3000`                               | HTTP port                            |
| `DATABASE_PATH`       | no       | `sqlite.db` (local) or `/data/...`  | SQLite database file path            |
| `AI_ENGINE_BASE_URL`  | yes      | `http://search-flow:8000`            | URL of the AI engine service         |
| `AI_SERVICE_BASE_URL` | yes      | `http://search-flow:8000`            | Base URL for AI service (legacy)    |
| `EMBEDDING_SERVICE_URL`| yes    | `http://embedding-service:8003`      | Embedding service endpoint          |
| `FILE_STORAGE_URL`    | yes      | `http://file-storage-service:8004`   | File storage service endpoint       |
| `SHAREPOINT_WEBHOOK_URL`| yes   | `http://sharepoint-webhook:8004`     | SharePoint webhook service URL      |
| `CORS_ORIGINS`        | yes      | comma-separated URLs                 | Allowed origins for CORS             |
| `JWT_SECRET`          | yes      | (random string)                      | Secret for signing JWT tokens        |
| `LOG_LEVELS`          | no       | `log,error,warn,debug,verbose`      | Comma-separated NestJS log levels   |

### Web (`apps/web/.env`)

| Variable                | Required | Default                     | Description                      |
|-------------------------|----------|-----------------------------|----------------------------------|
| `NODE_ENV`              | no       | `development`              | Runtime environment              |
| `PORT`                  | no       | `3001`                     | HTTP port                        |
| `NEXT_PUBLIC_BACKEND_URL`| yes     | `http://localhost:3000`    | Public URL of the backend API   |
| `INTERNAL_BACKEND_URL`  | yes      | `http://backend:3000`      | Internal URL for server-side use|
| `NEXT_PUBLIC_DEMO_MODE` | no       | `true`                     | Show/hide demo UI elements      |

### Search Flow (`services/search-flow/.env`)

| Variable                     | Required | Default / Example                     | Description                              |
|------------------------------|----------|---------------------------------------|------------------------------------------|
| `ENVIRONMENT`                | no       | `development`                        | Application environment                  |
| `DEBUG`                      | no       | `true`                               | Enable debug mode                        |
| `EMBEDDING_SERVICE_URL`      | yes      | `http://embedding-service:8003`      | Embedding service endpoint              |
| `MCP_SERVER_URL`             | yes      | `http://embedding-service:8003/...` | MCP server URL                           |
| `CREW_VERBOSE`               | no       | `false`                              | CrewAI verbose output                    |
| `CREW_MAX_ITER`              | no       | `5`                                  | Maximum crew iterations                  |
| `CREWAI_TRACING_ENABLED`     | no       | `false`                              | Enable CrewAI tracing                    |
| `CREWAI_STREAM`              | no       | `true`                               | Enable streaming results                 |
| `CREW_MAX_TOKENS`            | no       | `1500`                               | Max tokens for crew responses            |
| `SEARCH_TOP_K`               | no       | `10`                                 | Number of top results                    |
| `SEARCH_TOP_N`               | no       | `5`                                  | Number of top chunks                     |
| `CREW_HYDE_VERBOSE`          | no       | `true`                               | HyDE verbose logging                     |
| `CREW_HYDE_MAX_TOKENS`       | no       | `512`                                | Max tokens for HyDE generation           |
| `AZURE_HYDE_MODEL_NAME`      | no       | `gpt-4o-mini`                        | Azure model for HyDE                     |
| `AZURE_API_KEY`              | yes      | (your key)                           | Azure OpenAI API key                     |
| `AZURE_API_BASE`             | yes      | (your endpoint)                      | Azure OpenAI endpoint                    |
| `AZURE_API_VERSION`          | yes      | `2024-12-01-preview`                 | API version                              |
| `AZURE_MODEL_NAME`           | yes      | `azure/gpt-4.1`                      | Model deployment name                    |
| `LANGFUSE_*`                 | optional |                                       | Langfuse observability keys (if used)   |
| `LOG_LEVELS`                 | no       | `info,debug,warn,error`              | Comma-separated log levels              |

### Embedding Service (`services/embedding-service/.env`)

| Variable           | Required | Default                      | Description                          |
|--------------------|----------|------------------------------|--------------------------------------|
| `USE_LOCAL_QDRANT` | no       | `true`                       | Use local Qdrant instance            |
| `QDRANT_URL`       | yes      | `http://qdrant:6333`         | Qdrant server URL                    |
| `QDRANT_API_KEY`   | no       | (empty)                      | API key if Qdrant secured            |
| `COLLECTION_NAME`  | no       | `documents`                  | Qdrant collection name               |
| `EMBEDDING_MODEL`  | no       | `BAAI/bge-m3`                | HuggingFace embedding model          |
| `VECTOR_SIZE`      | no       | `1024`                       | Embedding vector dimensions          |
| `BATCH_SIZE`       | no       | `32`                         | Batch size for embedding             |
| `VERIFY_SSL`       | no       | `true`                       | Verify SSL for external requests    |
| `LOG_LEVEL`        | no       | `DEBUG`                      | Python logging level                 |

### Data Ingestion (`services/data-ingestion/.env`)

| Variable                      | Required | Default / Example                      | Description                          |
|-------------------------------|----------|----------------------------------------|--------------------------------------|
| `API_URL`                     | yes      | `http://embedding-service:8003/...`   | Embedding service upload endpoint   |
| `MAX_CHUNK_SIZE`              | no       | `512`                                  | Max chunk size for splitting        |
| `UPLOAD_DIR`                  | no       | `uploaded-files`                       | Local upload directory              |
| `ENABLE_SHAREPOINT_INTEGRATION`| no      | `false`                                | Enable SharePoint integration       |
| `RABBITMQ_HOST`               | yes      | `rabbitmq`                             | RabbitMQ host for event queue       |
| `FILE_STORAGE_URL`            | yes      | `http://file-storage-service:8004`    | File storage service URL            |
| `EMBEDDING_SERVICE_URL`       | yes      | `http://embedding-service:8003`       | Direct embedding service URL        |
| `VERIFY_SSL`                  | no       | `true`                                 | SSL verification for external calls|

### File Storage Service (`services/file-storage-service/.env`)

| Variable                    | Required | Default / Example                      | Description                          |
|-----------------------------|----------|----------------------------------------|--------------------------------------|
| `DB_PATH`                   | no       | `file_metadata.db`                     | SQLite database file path            |
| `S3_ENDPOINT`               | yes      | `http://aingo-minio:9000`             | MinIO / S3 endpoint                  |
| `S3_ACCESS_KEY`             | yes      | `minioadmin`                           | S3 access key                        |
| `S3_SECRET_KEY`             | yes      | `minioadmin`                           | S3 secret key                        |
| `S3_BUCKET`                 | yes      | `ingestion-bucket`                     | Default bucket name                  |
| `RABBITMQ_HOST`             | yes      | `rabbitmq`                             | RabbitMQ host for messaging         |
| `EMBEDDING_SERVICE_URL`     | yes      | `http://embedding-service:8003`       | Embedding service for sync           |
| `NESTJS_WEBHOOK_URL`        | yes      | `http://backend:3000/...`             | Backend webhook for status updates  |

### SharePoint Webhook (`services/sharepoint-webhook/.env`)

| Variable                     | Required | Default / Example                      | Description                          |
|------------------------------|----------|----------------------------------------|--------------------------------------|
| `SERVER_PORT`                | no       | `8004`                                 | Internal server port                |
| `FILE_STORAGE_URL`           | yes      | `http://file-storage-service:8004`    | File storage service URL            |
| `TENANT_ID`                  | yes      | (your tenant ID)                       | Azure AD tenant ID                  |
| `CLIENT_ID`                  | yes      | (your client ID)                       | Azure AD app client ID              |
| `CLIENT_SECRET`              | yes      | (your client secret)                   | Azure AD app client secret          |
| `TENANT_NAME`                | yes      | (your tenant name)                     | SharePoint tenant name              |
| `SITE_NAME`                  | yes      | (your site name)                       | SharePoint site name                |
| `LIST_NAME`                  | no       | `Documents`                            | SharePoint list/library name        |
| `ENABLE_SYNC`                | no       | `false`                                | Enable file synchronization         |
| `SYNC_DIR`                   | no       | `./synced_files`                       | Local directory for synced files    |
| `TUNNEL_TYPE`                | no       | `none` or `cloudflare`                 | External tunneling method           |
| `CLOUDFLARE_TUNNEL_URL`      | conditional| (your tunnel URL)                    | Required if `TUNNEL_TYPE=cloudflare`|
| `CLIENT_STATE`               | no       | `mySecretClientStateForTesting`       | OAuth client state                  |
| `LOG_LEVEL`                  | no       | `DEBUG`                                | Python logging level                |
| `LOG_DIR`                    | no       | `./logs`                               | Log file directory                  |
| `LOG_FILE`                   | no       | `sharepoint-webhook.log`               | Log file name                       |

## Notes on Ports and Networking

- All services communicate over the internal Docker network `aingo-net`. Use the service names (e.g., `http://backend:3000`) for inter-service communication.
- Host ports are published only for services that need to be accessed directly (API, UI, management). Infrastructural services like RabbitMQ and Qdrant are also published for debugging.
- Ensure that the listed host ports (see table above) are available on your machine.

## Reverse Proxy (Optional)

An Nginx reverse proxy configuration is provided (commented out) for production deployments. To use it:

1. Uncomment the `nginx` service in `docker-compose.yml`.
2. Prepare SSL certificates in `nginx/ssl/`.
3. Configure server blocks in `nginx/conf.d/`.
4. Change the `ports` section of the backend and web services to `expose` only (remove `ports`) to prevent direct host access.
5. Run `docker compose up -d nginx` and access via ports 80/443.

## Troubleshooting

- **Port conflicts**: If a port is already in use, either stop the conflicting service or change the host port mapping in `docker-compose.yml`.
- **Healthcheck failures**: Check container logs with `docker compose logs <service>`. Some services (e.g., sharepoint-webhook) use `/docs` as health endpoint; these return HTTP 200 as long as the API is responsive.
- **Missing environment variables**: The stack will fail to start if required variables are empty. Check the `.env` files.
- **Data persistence**: All data volumes are defined under the `volumes` section. They survive container restarts but are removed if you run `docker compose down -v`.
