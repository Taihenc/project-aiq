FROM python:3.9-slim

WORKDIR /app

COPY services/sharepoint-webhook /app/services/sharepoint-webhook

WORKDIR /app/services/sharepoint-webhook
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "main.py"]

