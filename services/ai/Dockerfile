# Use the official Python image as the base image
FROM python:3.11.9-slim-bullseye

# Set the working directory
WORKDIR /app/services/ai

# Copy requirements.txt from the build context (root)
COPY services/ai/requirements.txt .

# Install uv and then install dependencies
RUN pip install uv && uv pip install --system -r requirements.txt

# Copy the rest of the application code
COPY services/ai/. .

# Expose the port FastAPI runs on (default is 8000)
EXPOSE 8000

# Command to run the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]