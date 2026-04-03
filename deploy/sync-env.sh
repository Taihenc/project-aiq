#!/bin/bash

# Configuration
VM_ALIAS="aingo-vm"
REMOTE_DIR="~/AINGO"

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color
INFO='\033[1;34m'

echo -e "${INFO}Starting .env synchronization to ${VM_ALIAS}...${NC}"

# 1. Check if we can connect to the VM
if ! ssh -q "$VM_ALIAS" exit; then
    echo "Error: Cannot connect to $VM_ALIAS. Please check your ~/.ssh/config or VM status."
    exit 1
fi

# 2. Ensure remote directory exists
echo -e "${INFO}Verifying remote directory ${REMOTE_DIR}...${NC}"
ssh "$VM_ALIAS" "mkdir -p $REMOTE_DIR"

# 3. Find and sync all .env files
# We use rsync to efficiently mirror only the .env files while maintaining directory structure.
# --include='*/' includes all directories
# --include='.env' includes all .env files
# --exclude='*' excludes all other files
echo -e "${INFO}Syncing .env files...${NC}"
rsync -amv \
    --include='*/' \
    --include='.env' \
    --exclude='*' \
    . "$VM_ALIAS:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully synced all .env files to ${VM_ALIAS}!${NC}"
else
    echo "Error: Failed to sync .env files."
    exit 1
fi
