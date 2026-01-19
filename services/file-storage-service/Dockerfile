FROM python:3.12.9-alpine

WORKDIR /app

COPY services/file-storage-service /app/services/file-storage-service

WORKDIR /app/services/file-storage-service
RUN pip install --no-cache-dir -r requirements.txt

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]

