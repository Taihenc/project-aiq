FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copy the ai-engine service
COPY services/ai-engine /app/services/ai-engine

WORKDIR /app/services/ai-engine

# Install Python dependencies
RUN pip install --no-cache-dir --default-timeout=1000 -e .

# Expose the port the app runs on
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
