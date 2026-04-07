#!/bin/bash

# Configuration
PROJECT_DIR="$HOME/AINGO"

# Check for Docker Compose version (v2 uses 'docker compose', v1 uses 'docker-compose')
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "--- Starting Deployment at $(date) ---"

# 1. Ensure project directory exists and navigate to it
mkdir -p "$PROJECT_DIR" && cd "$PROJECT_DIR" || { echo "Error: Project directory $PROJECT_DIR not found"; exit 1; }

# 2. Check for existence (Verification)
# The Git logic has been removed for security. 
# Code is now 'pushed' from GitHub Actions using rsync.
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found. Check the rsync step in GitHub Actions."
    exit 1
fi
echo "--- Sources verified ---"

# 3. Rebuild and restart containers
# Note: --build ensures that any changes to Dockerfiles or local code are incorporated.
# -d runs in detached mode (background).
echo "--- Rebuilding and restarting containers ---"
$DOCKER_COMPOSE up -d --build || { echo "Error: Docker compose up failed"; exit 1; }

# 4. Optional: Clean up dangling images to save space on the VM
# Azure VMs often have limited OS disk space.
echo "--- Cleaning up unused Docker images ---"
docker image prune -f

echo "--- Deployment Complete ---"
