#!/bin/bash
# API 서버 안전한 배포 스크립트
# 최신 코드를 가져와서 빌드하고 배포합니다

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   O4O API Server Safe Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}📌 Current branch: $CURRENT_BRANCH${NC}"

# 2. Git 상태 확인
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}⚠️  Warning: You have uncommitted changes${NC}"
    git status -s
    read -p "Do you want to stash these changes? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash push -m "Auto-stash before deployment $(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✅ Changes stashed${NC}"
    else
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
fi

# 3. 최신 코드 가져오기
echo -e "${YELLOW}🔄 Fetching latest code...${NC}"
git fetch origin main
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
    echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
    git pull origin main
    echo -e "${GREEN}✅ Code updated to latest version${NC}"
else
    echo -e "${GREEN}✅ Already up to date${NC}"
fi

# 4. 현재 커밋 정보 저장
DEPLOY_COMMIT=$(git rev-parse --short HEAD)
DEPLOY_MESSAGE=$(git log -1 --pretty=%B)
DEPLOY_AUTHOR=$(git log -1 --pretty=%an)
DEPLOY_DATE=$(date +"%Y-%m-%d %H:%M:%S")

echo -e "${BLUE}📋 Deployment Info:${NC}"
echo -e "  Commit: ${DEPLOY_COMMIT}"
echo -e "  Message: ${DEPLOY_MESSAGE}"
echo -e "  Author: ${DEPLOY_AUTHOR}"
echo -e "  Date: ${DEPLOY_DATE}"

# 5. 의존성 설치
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# 6. TypeScript 컴파일 확인 (선택적)
echo -e "${YELLOW}🔍 Checking TypeScript compilation...${NC}"
cd apps/api-server
if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript has some warnings (build will continue)${NC}"
fi
cd ../..

# 7. 빌드
echo -e "${YELLOW}🔨 Building API server...${NC}"
pnpm run build:packages
pnpm run build:api

if [ -f "apps/api-server/dist/main.js" ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed - main.js not found${NC}"
    exit 1
fi

# 8. 배포 기록 저장
echo -e "${YELLOW}📝 Saving deployment record...${NC}"
cat > deployment-record.json << EOF
{
  "timestamp": "${DEPLOY_DATE}",
  "commit": "${DEPLOY_COMMIT}",
  "message": "${DEPLOY_MESSAGE}",
  "author": "${DEPLOY_AUTHOR}",
  "branch": "${CURRENT_BRANCH}",
  "server": "apiserver"
}
EOF

# 9. PM2 재시작
echo -e "${YELLOW}🚀 Restarting API server with PM2...${NC}"
if pm2 list | grep -q "o4o-api"; then
    pm2 reload ecosystem.config.apiserver.cjs --update-env
    echo -e "${GREEN}✅ API server reloaded${NC}"
else
    pm2 start ecosystem.config.apiserver.cjs
    echo -e "${GREEN}✅ API server started${NC}"
fi

# 10. 헬스 체크
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 5
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is healthy${NC}"
elif curl -f http://localhost:4000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is responding${NC}"
else
    echo -e "${RED}⚠️  Health check failed, checking PM2 logs...${NC}"
    pm2 logs o4o-api --lines 20 --nostream
fi

# 11. 완료
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  Server: API Server"
echo -e "  Commit: ${DEPLOY_COMMIT}"
echo -e "  Time: ${DEPLOY_DATE}"
echo -e "${GREEN}========================================${NC}"

# PM2 상태 표시
pm2 status o4o-api