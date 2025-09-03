#!/bin/bash

# O4O Platform - 서버 배포 스크립트
# 사용법: ./scripts/deploy-to-server.sh [webserver|apiserver|both]

set -e  # 오류 발생시 중단

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 배포 타입 확인
DEPLOY_TYPE=${1:-both}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   O4O Platform 서버 배포 스크립트${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 오류: O4O Platform 루트 디렉토리에서 실행해주세요.${NC}"
    exit 1
fi

# Git 최신 코드 가져오기
echo -e "${YELLOW}📥 최신 코드 가져오는 중...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull 실패. 로컬 변경사항을 확인하세요.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 최신 코드 가져오기 완료${NC}"
echo ""

# 의존성 설치
echo -e "${YELLOW}📦 의존성 설치 중...${NC}"
pnpm install --frozen-lockfile

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 의존성 설치 실패${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 의존성 설치 완료${NC}"
echo ""

# 서버 타입에 따른 배포
case $DEPLOY_TYPE in
    webserver)
        echo -e "${BLUE}🌐 웹서버 배포 시작...${NC}"
        echo ""
        
        # 프론트엔드 빌드
        echo -e "${YELLOW}🔨 프론트엔드 빌드 중...${NC}"
        pnpm run build:web
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ 프론트엔드 빌드 실패${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ 프론트엔드 빌드 완료${NC}"
        echo ""
        
        # PM2 재시작
        echo -e "${YELLOW}🔄 웹서버 재시작 중...${NC}"
        pnpm run pm2:restart:webserver || pm2 restart o4o-admin-webserver o4o-web-webserver
        
        echo -e "${GREEN}✅ 웹서버 배포 완료!${NC}"
        echo ""
        echo -e "${BLUE}📝 다음 URL에서 확인:${NC}"
        echo "   - Admin: https://admin.neture.co.kr"
        echo "   - Storefront: https://neture.co.kr"
        ;;
        
    apiserver)
        echo -e "${BLUE}🔧 API 서버 배포 시작...${NC}"
        echo ""
        
        # API 서버 빌드
        echo -e "${YELLOW}🔨 API 서버 빌드 중...${NC}"
        pnpm run build:api
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ API 서버 빌드 실패${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ API 서버 빌드 완료${NC}"
        echo ""
        
        # 데이터베이스 마이그레이션 (선택적)
        echo -e "${YELLOW}💾 데이터베이스 마이그레이션 확인 중...${NC}"
        cd apps/api-server
        
        # 마이그레이션 상태 확인
        pnpm run migration:show 2>/dev/null || echo "마이그레이션 확인 스킵"
        
        read -p "데이터베이스 마이그레이션을 실행하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}🔄 마이그레이션 실행 중...${NC}"
            pnpm run migration:run
            echo -e "${GREEN}✅ 마이그레이션 완료${NC}"
        else
            echo -e "${BLUE}ℹ️ 마이그레이션 스킵${NC}"
        fi
        
        cd ../..
        echo ""
        
        # PM2 재시작
        echo -e "${YELLOW}🔄 API 서버 재시작 중...${NC}"
        pnpm run pm2:restart:apiserver || pm2 restart o4o-api-apiserver
        
        echo -e "${GREEN}✅ API 서버 배포 완료!${NC}"
        echo ""
        echo -e "${BLUE}📝 API URL: https://api.neture.co.kr${NC}"
        ;;
        
    both)
        echo -e "${BLUE}🚀 전체 서버 배포 시작...${NC}"
        echo ""
        
        # 프론트엔드 빌드
        echo -e "${YELLOW}🔨 프론트엔드 빌드 중...${NC}"
        pnpm run build:web
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ 프론트엔드 빌드 실패${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ 프론트엔드 빌드 완료${NC}"
        echo ""
        
        # API 서버 빌드
        echo -e "${YELLOW}🔨 API 서버 빌드 중...${NC}"
        pnpm run build:api
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ API 서버 빌드 실패${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ API 서버 빌드 완료${NC}"
        echo ""
        
        # PM2 전체 재시작
        echo -e "${YELLOW}🔄 모든 서버 재시작 중...${NC}"
        
        # 서버 타입 확인
        if [ "$SERVER_TYPE" = "webserver" ]; then
            pnpm run pm2:restart:webserver || pm2 restart ecosystem.config.webserver.cjs
        elif [ "$SERVER_TYPE" = "apiserver" ]; then
            pnpm run pm2:restart:apiserver || pm2 restart ecosystem.config.apiserver.cjs
        else
            # 로컬 또는 전체
            pm2 restart all
        fi
        
        echo -e "${GREEN}✅ 전체 서버 배포 완료!${NC}"
        echo ""
        echo -e "${BLUE}📝 다음 URL에서 확인:${NC}"
        echo "   - Admin: https://admin.neture.co.kr"
        echo "   - Storefront: https://neture.co.kr"
        echo "   - API: https://api.neture.co.kr"
        ;;
        
    *)
        echo -e "${RED}❌ 잘못된 배포 타입: $DEPLOY_TYPE${NC}"
        echo "사용법: $0 [webserver|apiserver|both]"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 배포가 성공적으로 완료되었습니다!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 서버 상태 확인
echo -e "${YELLOW}📊 PM2 프로세스 상태:${NC}"
pm2 status

echo ""
echo -e "${BLUE}💡 팁:${NC}"
echo "   - 로그 확인: pm2 logs"
echo "   - 실시간 모니터링: pm2 monit"
echo "   - 캐시 문제시: 브라우저에서 Ctrl+Shift+R (강력 새로고침)"
echo ""