FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for PDF/OCR processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY services/data-ingestion/pyproject.toml /app/services/data-ingestion/

WORKDIR /app/services/data-ingestion

# Install dependencies via pip
RUN pip install --no-cache-dir --default-timeout=1000 .

# Copy application code
COPY services/data-ingestion /app/services/data-ingestion

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
