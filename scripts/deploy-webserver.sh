#!/bin/bash
# ================================
# O4O Platform - Web Server Deployment Script
# ================================

set -e

echo "🚀 O4O Web Server 배포 시작..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 환경 변수 체크
if [ -z "$SERVER_TYPE" ]; then
    export SERVER_TYPE="webserver"
fi

# Step 1: 의존성 설치
echo -e "${YELLOW}📦 의존성 설치 중...${NC}"
npm ci --production

# Step 2: 빌드
echo -e "${YELLOW}🔨 애플리케이션 빌드 중...${NC}"
npm run build:web

# Step 3: PM2 프로세스 중지 (있으면)
echo -e "${YELLOW}⏹️ 기존 프로세스 중지...${NC}"
pm2 stop o4o-webserver o4o-admin 2>/dev/null || true
pm2 delete o4o-webserver o4o-admin 2>/dev/null || true

# Step 4: systemd 서비스 설치 (PM2 대신)
echo -e "${YELLOW}🔧 Systemd 서비스 설정...${NC}"
sudo cp config/systemd/o4o-webserver.service /etc/systemd/system/
sudo cp config/systemd/o4o-admin.service /etc/systemd/system/
sudo systemctl daemon-reload

# Step 5: 서비스 시작
echo -e "${YELLOW}▶️ 서비스 시작...${NC}"
sudo systemctl start o4o-webserver
sudo systemctl start o4o-admin

# Step 6: 자동시작 설정
echo -e "${YELLOW}🔄 자동시작 설정...${NC}"
sudo systemctl enable o4o-webserver
sudo systemctl enable o4o-admin

# Step 7: 상태 확인
echo -e "${YELLOW}✅ 서비스 상태 확인...${NC}"
sudo systemctl status o4o-webserver --no-pager
sudo systemctl status o4o-admin --no-pager

echo -e "${GREEN}✨ Web Server 배포 완료!${NC}"
echo -e "${GREEN}📍 Main Site: http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "${GREEN}📍 Admin Dashboard: http://$(hostname -I | awk '{print $1}'):3001${NC}"