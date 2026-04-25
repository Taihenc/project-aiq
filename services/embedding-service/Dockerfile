# Base stage
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_HTTP_TIMEOUT=60

# Install system dependencies
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  build-essential \
  zlib1g-dev \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps
COPY services/embedding-service/pyproject.toml services/embedding-service/uv.lock ./
COPY services/shared/python/aingo_utils /app/aingo_utils
RUN uv sync --frozen --no-install-project --no-dev --python 3.12

# Builder stage
FROM deps AS builder
COPY services/embedding-service .
RUN uv sync --frozen --no-dev --python 3.12

# Dev stage
FROM deps AS dev
COPY services/shared/python/aingo_utils /app/aingo_utils
COPY services/embedding-service .
RUN uv sync --frozen --python 3.12
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8003
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]

# Production stage
FROM base AS prod
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8003
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8003/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
