FROM python:3.13.7-alpine

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
  build-essential \
  zlib1g-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy the embedding-service
COPY services/embedding-service /app/services/embedding-service

WORKDIR /app/services/embedding-service

# Install Python dependencies
RUN pip install --no-cache-dir --default-timeout=1000 -e .

# Expose the port the app runs on
EXPOSE 8003

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
