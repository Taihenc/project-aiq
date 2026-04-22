FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_HTTP_TIMEOUT=60

# Install system dependencies with a retry loop to bypass proxy issues
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  build-essential \
  zlib1g-dev \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY services/embedding-service/pyproject.toml services/embedding-service/uv.lock ./

# Install dependencies before code to leverage Docker layer caching
RUN uv sync --frozen --no-install-project --no-dev --python 3.12

# Copy shared utilities
COPY services/shared/python/aingo_utils /app/aingo_utils

# Copy application code
COPY services/embedding-service .

# Install the project itself
RUN uv sync --frozen --no-dev --python 3.12

# Place executables at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8003/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
