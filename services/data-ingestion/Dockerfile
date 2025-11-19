FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY services/data-ingestion /app/services/data-ingestion

WORKDIR /app/services/data-ingestion
RUN pip install --no-cache-dir --default-timeout=1000 -e .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]


