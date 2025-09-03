#!/bin/bash

# 양쪽 서버 동시 배포 스크립트
# Git push 후 각 서버에서 pull 및 재시작

set -e

# 서버 정보
WEBSERVER="root@13.125.144.8"
APISERVER="root@43.202.242.215"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 O4O Platform 서버 배포 시작${NC}"
echo ""

# 1. Git 상태 확인
echo -e "${YELLOW}📋 Git 상태 확인...${NC}"
git status --short

# 변경사항이 있으면 커밋 및 푸시
if [[ $(git status --porcelain) ]]; then
    echo -e "${YELLOW}📝 변경사항 발견. 커밋 중...${NC}"
    git add -A
    git commit -m "Deploy: Auto-commit before deployment $(date +%Y%m%d-%H%M%S)"
    git push origin main
else
    echo -e "${GREEN}✅ 모든 변경사항이 이미 커밋됨${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}1️⃣  API 서버 배포 (43.202.242.215)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh $APISERVER << 'APIEOF'
set -e
echo "🔄 API 서버 업데이트 시작..."

# Git pull
cd /var/www/api-server
echo "📥 최신 코드 가져오기..."
git pull origin main

# .env 파일 보호 확인
if [ ! -f .env ]; then
    echo "⚠️  .env 파일이 없습니다!"
    echo "📝 .env.production 복사 중..."
    if [ -f apps/api-server/.env.production ]; then
        cp apps/api-server/.env.production .env
    else
        echo "❌ .env.production도 없습니다. 수동 설정 필요!"
    fi
fi

# 의존성 설치 (production만)
echo "📦 Production 의존성 설치..."
cd apps/api-server
pnpm install --frozen-lockfile --only=production || pnpm install --only=production

# PM2로 재시작
echo "🔄 API 서버 재시작..."
pm2 restart api-server || pm2 start dist/main.js --name api-server

# 상태 확인
pm2 status api-server
sleep 3

# Health check
echo "🏥 Health check..."
curl -s http://localhost:4000/health || echo "⚠️  Health check 실패"

echo "✅ API 서버 배포 완료!"
APIEOF

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}2️⃣  웹 서버 배포 (13.125.144.8)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh $WEBSERVER << 'WEBEOF'
set -e
echo "🔄 웹 서버 업데이트 시작..."

# Git pull
cd /var/www/o4o-platform
echo "📥 최신 코드 가져오기..."
git pull origin main

# Admin Dashboard 빌드 확인
if [ -d "apps/admin-dashboard" ]; then
    echo "🔨 Admin Dashboard 빌드..."
    cd apps/admin-dashboard
    
    # .env 파일 확인
    if [ ! -f .env ]; then
        echo "📝 .env 파일 생성..."
        cat > .env << 'ENV'
VITE_API_URL=https://api.neture.co.kr
VITE_APP_NAME="O4O Admin"
VITE_APP_VERSION=1.0.0
ENV
    fi
    
    # 빌드
    pnpm install --frozen-lockfile || pnpm install
    pnpm run build
    
    # 배포
    echo "📤 빌드 파일 배포..."
    sudo cp -r dist/* /var/www/admin.neture.co.kr/
    
    cd ../..
fi

# Shop 앱 확인
if [ -d "apps/shop" ]; then
    echo "🔨 Shop 앱 빌드..."
    cd apps/shop
    pnpm install --frozen-lockfile || pnpm install
    pnpm run build
    sudo cp -r dist/* /var/www/shop.neture.co.kr/
    cd ../..
fi

# Nginx 설정 리로드
echo "🔄 Nginx 재시작..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ 웹 서버 배포 완료!"
WEBEOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 전체 배포 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 확인 명령어:${NC}"
echo -e "  API 서버 상태: ssh $APISERVER 'pm2 status'"
echo -e "  API 서버 로그: ssh $APISERVER 'pm2 logs api-server --lines 50'"
echo -e "  웹 서버 상태: ssh $WEBSERVER 'systemctl status nginx'"
echo ""
echo -e "${YELLOW}🌐 서비스 URL:${NC}"
echo -e "  Admin: https://admin.neture.co.kr"
echo -e "  API: https://api.neture.co.kr"
echo -e "  Shop: https://shop.neture.co.kr"