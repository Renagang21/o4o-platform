#!/bin/bash

# O4O Platform Full Deployment Script
# Deploys to both API and Web servers

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   O4O Platform Full Deployment${NC}"
echo -e "${BLUE}======================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Deploy API Server
echo -e "\n${GREEN}Step 1/2: Deploying API Server${NC}"
"$SCRIPT_DIR/deploy-api.sh" $1

# Deploy Web Server
echo -e "\n${GREEN}Step 2/2: Deploying Web Server${NC}"
"$SCRIPT_DIR/deploy-web.sh" $1

echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}✓ Full Deployment Complete!${NC}"
echo -e "${BLUE}  API Server: 43.202.242.215${NC}"
echo -e "${BLUE}  Web Server: 13.125.144.8${NC}"
echo -e "${BLUE}======================================${NC}"
