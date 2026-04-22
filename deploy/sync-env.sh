#!/bin/bash

# Configuration
VM_ALIAS="aingo-vm"
REMOTE_DIR="~/AINGO"

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color
INFO='\033[1;34m'

echo -e "${INFO}Starting .env and Caddyfile synchronization to ${VM_ALIAS}...${NC}"

# 1. Check if we can connect to the VM
if ! ssh -q "$VM_ALIAS" exit; then
    echo "Error: Cannot connect to $VM_ALIAS. Please check your ~/.ssh/config or VM status."
    exit 1
fi

# 2. Ensure remote directory exists
echo -e "${INFO}Verifying remote directory ${REMOTE_DIR}...${NC}"
ssh "$VM_ALIAS" "mkdir -p $REMOTE_DIR"

# 3. Find and sync all .env and Caddyfile files
# We use exclusions to avoid scanning heavy directories like node_modules and .venv
echo -e "${INFO}Syncing configurations...${NC}"
rsync -amv \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.venv/' \
    --exclude='.turbo/' \
    --include='*/' \
    --include='.env' \
    --include='Caddyfile' \
    --exclude='*' \
    . "$VM_ALIAS:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully synced configs to ${VM_ALIAS}!${NC}"
else
    echo "Error: Failed to sync configuration files."
    exit 1
fi
