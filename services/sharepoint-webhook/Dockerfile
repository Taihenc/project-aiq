# Base stage
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
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

# Dependencies stage
FROM base AS deps
COPY services/sharepoint-webhook/pyproject.toml services/sharepoint-webhook/uv.lock services/sharepoint-webhook/README.md ./
COPY services/shared/python/aingo_utils /app/aingo_utils
RUN uv sync --frozen --no-install-project --no-dev --python 3.12

# Builder stage
FROM deps AS builder
COPY services/sharepoint-webhook .
RUN uv sync --frozen --no-dev --python 3.12

# Dev stage
FROM deps AS dev
COPY services/shared/python/aingo_utils /app/aingo_utils
COPY services/sharepoint-webhook .
RUN uv sync --frozen --python 3.12
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8004
CMD ["sh", "-c", "alembic upgrade head && python main.py"]

# Production stage
FROM base AS prod
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8004
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8004/docs')" || exit 1
CMD ["sh", "-c", "alembic upgrade head && python main.py"]
