FROM python:3.12-slim

WORKDIR /app

# Copy dependency files
COPY services/search-flow/pyproject.toml /app/services/search-flow/

WORKDIR /app/services/search-flow

# Install dependencies via pip
RUN pip install --no-cache-dir --default-timeout=1000 .

# Copy application code
COPY services/search-flow /app/services/search-flow

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
