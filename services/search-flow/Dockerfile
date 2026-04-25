# Base stage
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_HTTP_TIMEOUT=60

# Dependencies stage
FROM base AS deps
COPY services/search-flow/pyproject.toml services/search-flow/uv.lock services/search-flow/README.md ./
COPY services/shared/python/aingo_utils /app/aingo_utils
RUN uv sync --frozen --no-install-project --python 3.12

# Builder stage
FROM deps AS builder
COPY services/search-flow .
RUN uv sync --frozen --python 3.12

# Dev stage
FROM deps AS dev
COPY services/shared/python/aingo_utils /app/aingo_utils
COPY services/search-flow .
RUN uv sync --frozen --python 3.12
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base AS prod
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
