FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_HTTP_TIMEOUT=60

# Install curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY services/file-storage-service/pyproject.toml services/file-storage-service/uv.lock ./

# Install dependencies before code to leverage Docker layer caching
RUN uv sync --frozen --no-install-project --no-dev --python 3.12

# Copy shared utilities
COPY services/shared/python/aingo_utils /app/aingo_utils

# Copy application code
COPY services/file-storage-service .

# Install the project
RUN uv sync --frozen --no-dev --python 3.12

# Place executables at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

# Changing port from 8003 to 8004 to avoid collision with embedding-service
EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8004/docs')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
