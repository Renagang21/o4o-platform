#!/bin/bash

# O4O Platform SSH Key Update Script
# 다른 작업 환경에서 SSH 키를 업데이트할 때 사용

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "  O4O Platform SSH Key Update Helper"
echo "========================================"

# 1. 현재 SSH 키 백업
echo -e "\n${YELLOW}Step 1: Backing up existing keys...${NC}"
if [ -f ~/.ssh/o4o_web_key ]; then
    mv ~/.ssh/o4o_web_key ~/.ssh/o4o_web_key.old.$(date +%Y%m%d)
    echo "  Backed up old web key"
fi

# 2. 새로운 키 설치 안내
echo -e "\n${YELLOW}Step 2: Install new SSH keys${NC}"
echo "Please place your new SSH keys in ~/.ssh/ directory:"
echo "  - API Server key: ~/.ssh/o4o_api_key"
echo "  - Web Server key: ~/.ssh/o4o_web_key (새로운 키)"

read -p "Have you placed the new keys? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Installation cancelled${NC}"
    exit 1
fi

# 3. 권한 설정
echo -e "\n${YELLOW}Step 3: Setting permissions...${NC}"
chmod 600 ~/.ssh/o4o_api_key 2>/dev/null && echo "  ✓ API key permissions set"
chmod 600 ~/.ssh/o4o_web_key 2>/dev/null && echo "  ✓ Web key permissions set"

# 4. SSH config 업데이트
echo -e "\n${YELLOW}Step 4: Updating SSH config...${NC}"
cat > ~/.ssh/config << 'CONFIG'
# O4O Platform Servers Configuration

# API Server (변경 없음)
Host o4o-api api-server
    HostName 43.202.242.215
    User ubuntu
    IdentityFile ~/.ssh/o4o_api_key
    StrictHostKeyChecking no
    ServerAliveInterval 60
    ServerAliveCountMax 3
    Port 22

# Web Server (새 키 사용)
Host o4o-web web-server
    HostName 13.125.144.8
    User ubuntu
    IdentityFile ~/.ssh/o4o_web_key
    StrictHostKeyChecking no
    ServerAliveInterval 60
    ServerAliveCountMax 3
    Port 22
CONFIG

echo "  ✓ SSH config updated"

# 5. 연결 테스트
echo -e "\n${YELLOW}Step 5: Testing connections...${NC}"

echo -n "  Testing API server... "
if ssh -o ConnectTimeout=5 o4o-api "exit" 2>/dev/null; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo -n "  Testing Web server... "
if ssh -o ConnectTimeout=5 o4o-web "exit" 2>/dev/null; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo -e "\n========================================"
echo -e "${GREEN}Configuration complete!${NC}"
echo "You can now use the deployment scripts:"
echo "  ./scripts/deploy-all.sh"
echo "  ./scripts/deploy-api.sh"
echo "  ./scripts/deploy-web.sh"
echo "========================================"
