#!/bin/bash
# ================================
# O4O Platform - API Server Deployment Script
# ================================

set -e

echo "🚀 O4O API Server 배포 시작..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 환경 변수 체크
if [ -z "$SERVER_TYPE" ]; then
    export SERVER_TYPE="apiserver"
fi

# Step 1: 환경 설정 파일 확인
echo -e "${YELLOW}🔍 환경 설정 확인...${NC}"
if [ ! -f "apps/api-server/.env" ]; then
    if [ -f "apps/api-server/.env-apiserver" ]; then
        cp apps/api-server/.env-apiserver apps/api-server/.env
        echo "환경 설정 파일 복사됨"
    else
        echo -e "${RED}❌ 환경 설정 파일이 없습니다!${NC}"
        exit 1
    fi
fi

# Step 2: 의존성 설치
echo -e "${YELLOW}📦 의존성 설치 중...${NC}"
cd apps/api-server
npm ci --production
cd ../..

# Step 3: 빌드
echo -e "${YELLOW}🔨 API Server 빌드 중...${NC}"
cd apps/api-server
npm run build:prod
cd ../..

# Step 4: 데이터베이스 확인
echo -e "${YELLOW}🗄️ 데이터베이스 연결 테스트...${NC}"
cd apps/api-server
npm run db:test || echo -e "${YELLOW}⚠️ DB 연결 실패 - 계속 진행${NC}"
cd ../..

# Step 5: PM2로 실행
echo -e "${YELLOW}▶️ PM2로 API Server 시작...${NC}"
pm2 stop o4o-api 2>/dev/null || true
pm2 delete o4o-api 2>/dev/null || true
pm2 start ecosystem.config-apiserver.cjs

# Step 6: PM2 프로세스 저장
echo -e "${YELLOW}💾 PM2 프로세스 저장...${NC}"
pm2 save

# Step 7: 상태 확인
echo -e "${YELLOW}✅ 서비스 상태 확인...${NC}"
pm2 status
sleep 3

# Step 8: 헬스체크
echo -e "${YELLOW}🏥 헬스체크...${NC}"
curl -f http://localhost:3001/api/health || echo -e "${YELLOW}⚠️ 헬스체크 실패${NC}"

echo -e "${GREEN}✨ API Server 배포 완료!${NC}"
echo -e "${GREEN}📍 API Endpoint: http://$(hostname -I | awk '{print $1}'):3001${NC}"