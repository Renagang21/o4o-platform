#!/bin/bash

# O4O Platform Connection Test Script

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "    O4O Platform Server Connection Test"
echo "========================================"

# Test API Server
echo -e "\n1. API Server (43.202.242.215):"
if ssh -o ConnectTimeout=5 o4o-apiserver "echo '   Status: Connected'" 2>/dev/null; then
    ssh o4o-apiserver "echo '   User: '\$(whoami)"
    ssh o4o-apiserver "echo '   Hostname: '\$(hostname)"
    ssh o4o-apiserver "pm2 list | grep o4o-api | head -1" 2>/dev/null && echo "   PM2: Running" || echo "   PM2: Not found"
    echo -e "${GREEN}   ✓ API Server OK${NC}"
else
    echo -e "${RED}   ✗ Cannot connect to API Server${NC}"
fi

# Test Web Server
echo -e "\n2. Web Server (13.125.144.8):"
if ssh -o ConnectTimeout=5 o4o-webserver "echo '   Status: Connected'" 2>/dev/null; then
    ssh o4o-webserver "echo '   User: '\$(whoami)"
    ssh o4o-webserver "echo '   Hostname: '\$(hostname)"
    ssh o4o-webserver "sudo systemctl is-active nginx | sed 's/^/   Nginx: /'" 2>/dev/null
    echo -e "${GREEN}   ✓ Web Server OK${NC}"
else
    echo -e "${RED}   ✗ Cannot connect to Web Server${NC}"
fi

echo -e "\n========================================"
echo "SSH Keys in use:"
echo "  API: ~/.ssh/o4o_api_key"
echo "  Web: ~/.ssh/o4o_web_key"
echo "========================================"
