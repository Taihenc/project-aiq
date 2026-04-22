FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_HTTP_TIMEOUT=60

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  && curl -Lk --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  && chmod +x /usr/local/bin/cloudflared \
  && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY services/sharepoint-webhook/pyproject.toml services/sharepoint-webhook/uv.lock services/sharepoint-webhook/README.md ./

# Install dependencies before code to leverage Docker layer caching
RUN uv sync --frozen --no-install-project --no-dev --python 3.12

# Copy shared utilities
COPY services/shared/python/aingo_utils /app/aingo_utils

# Copy application code
COPY services/sharepoint-webhook .

# Install the project itself
RUN uv sync --frozen --no-dev --python 3.12

# Place executables at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8004/docs')" || exit 1

CMD ["sh", "-c", "alembic upgrade head && python main.py"]
