FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY services/embedding-service/pyproject.toml /app/services/embedding-service/

WORKDIR /app/services/embedding-service

# Install dependencies via pip
RUN pip install --no-cache-dir --default-timeout=1000 .

# Copy application code
COPY services/embedding-service /app/services/embedding-service

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8003/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
