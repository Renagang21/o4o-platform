#!/bin/bash

# API Server Deployment Script
# Usage: ./scripts/deploy-api.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 O4O API 서버 배포 시작...${NC}"
echo "================================"

# 1. 코드 동기화
echo -e "${YELLOW}📥 Step 1/7: 코드 동기화 중...${NC}"
git pull origin main
echo -e "${GREEN}✓ 코드 동기화 완료${NC}"

# 2. 캐시 정리
echo -e "${YELLOW}🧹 Step 2/7: NPM 캐시 정리 중...${NC}"
npm cache clean --force
rm -rf node_modules/.uuid-* node_modules/.tmp-*
echo -e "${GREEN}✓ 캐시 정리 완료${NC}"

# 3. 의존성 설치
echo -e "${YELLOW}📦 Step 3/7: 의존성 설치 중...${NC}"
if pnpm install --frozen-lockfile --production; then
    echo -e "${GREEN}✓ 의존성 설치 완료 (ci)${NC}"
else
    echo -e "${YELLOW}⚠ pnpm install --frozen-lockfile 실패, pnpm install 시도 중...${NC}"
    pnpm install --production
    echo -e "${GREEN}✓ 의존성 설치 완료 (install)${NC}"
fi

# 4. 패키지 빌드
echo -e "${YELLOW}🔨 Step 4/7: 패키지 빌드 중...${NC}"
pnpm run build:packages
echo -e "${GREEN}✓ 패키지 빌드 완료${NC}"

# 5. API 서버 빌드
echo -e "${YELLOW}🔨 Step 5/7: API 서버 빌드 중...${NC}"
pnpm run build --workspace=@o4o/api-server
echo -e "${GREEN}✓ API 서버 빌드 완료${NC}"

# 6. 데이터베이스 마이그레이션 (선택적)
echo -e "${YELLOW}🗄️ Step 6/7: 데이터베이스 마이그레이션${NC}"
read -p "데이터베이스 마이그레이션을 실행하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd apps/api-server
    pnpm run migration:run
    cd ../..
    echo -e "${GREEN}✓ 마이그레이션 완료${NC}"
else
    echo -e "${YELLOW}⊗ 마이그레이션 건너뜀${NC}"
fi

# 7. PM2 재시작
echo -e "${YELLOW}♻️ Step 7/7: PM2 재시작 중...${NC}"
pm2 reload o4o-api-server --update-env
echo -e "${GREEN}✓ PM2 재시작 완료${NC}"

# 8. 배포 확인
echo "================================"
echo -e "${YELLOW}✅ 배포 확인 중...${NC}"

# PM2 상태 확인
echo -e "\n${YELLOW}PM2 상태:${NC}"
pm2 status o4o-api-server

# Health check
echo -e "\n${YELLOW}Health Check:${NC}"
if curl -f http://localhost:3001/health 2>/dev/null; then
    echo -e "\n${GREEN}✓ API 서버가 정상적으로 실행 중입니다${NC}"
else
    echo -e "\n${RED}✗ API 서버 응답 실패! 로그를 확인하세요${NC}"
    echo -e "${YELLOW}pm2 logs o4o-api-server --lines 50${NC}"
    exit 1
fi

# 최근 로그 출력
echo -e "\n${YELLOW}최근 로그 (5줄):${NC}"
pm2 logs o4o-api-server --nostream --lines 5

echo "================================"
echo -e "${GREEN}✨ API 서버 배포 완료!${NC}"
echo -e "${YELLOW}접속 URL: http://api.neture.co.kr${NC}"
echo -e "${YELLOW}로그 확인: pm2 logs o4o-api-server${NC}"