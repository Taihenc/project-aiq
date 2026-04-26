# Base stage
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_HTTP_TIMEOUT=60

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps
COPY services/data-ingestion/pyproject.toml services/data-ingestion/uv.lock ./
COPY services/shared/python/aingo_utils /app/aingo_utils
RUN uv sync --frozen --no-install-project --no-dev --python 3.12

# Builder stage
FROM deps AS builder
COPY services/data-ingestion .
RUN uv sync --frozen --no-dev --python 3.12

# Dev stage
FROM deps AS dev
COPY services/shared/python/aingo_utils /app/aingo_utils
COPY services/data-ingestion .
RUN uv sync --frozen --python 3.12
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]

# Production stage
FROM base AS prod
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
