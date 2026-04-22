FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_HTTP_TIMEOUT=60

# Copy dependency files
COPY services/search-flow/pyproject.toml services/search-flow/uv.lock services/search-flow/README.md ./

# Install dependencies before code to leverage Docker layer caching
RUN uv sync --frozen --no-install-project --no-dev --python 3.12

# Copy shared utilities
COPY services/shared/python/aingo_utils /app/aingo_utils

# Copy application code
COPY services/search-flow .

# Install the project itself
RUN uv sync --frozen --no-dev --python 3.12

# Place executables at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
