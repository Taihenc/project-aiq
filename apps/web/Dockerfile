# Use the official Python image as the base image
FROM python:3.11.9-slim-bullseye

# Set the working directory
WORKDIR /app/apps/web

# Copy requirements.txt from the build context (root)
COPY apps/web/requirements.txt .

# Install uv and then install dependencies
RUN pip install uv && uv pip install --system -r requirements.txt

# Copy the rest of the application code
COPY apps/web/. .

# Expose the port Streamlit runs on (default is 8501)
EXPOSE 8501

# Command to run the Streamlit application
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]