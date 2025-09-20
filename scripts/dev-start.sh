#!/bin/bash

# ============================================
# O4O Platform 개발 환경 빠른 시작
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 O4O Platform 개발 환경 시작${NC}"
echo "================================================"

# PostgreSQL 서비스 상태 확인 및 시작
echo -e "${YELLOW}🔍 PostgreSQL 서비스 확인 중...${NC}"
if ! sudo systemctl is-active --quiet postgresql; then
    echo -e "${YELLOW}🔄 PostgreSQL 서비스 시작 중...${NC}"
    sudo systemctl start postgresql
    sleep 2
fi

if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL 서비스 실행 중${NC}"
else
    echo -e "${RED}❌ PostgreSQL 서비스 시작 실패${NC}"
    echo "다음 명령을 실행해 주세요:"
    echo "sudo ./scripts/setup-local-db.sh"
    exit 1
fi

# .env 파일 존재 확인
ENV_FILE="/home/sohae21/o4o-platform/apps/api-server/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️ .env 파일이 없습니다. 자동 설정을 실행하시겠습니까? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        sudo ./scripts/setup-local-db.sh
    else
        echo -e "${RED}❌ .env 파일이 필요합니다${NC}"
        exit 1
    fi
fi

# 데이터베이스 연결 테스트
echo -e "${YELLOW}🔍 데이터베이스 연결 테스트 중...${NC}"
cd /home/sohae21/o4o-platform/apps/api-server

# .env 파일에서 DB 정보 읽기
source .env 2>/dev/null || true

if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 데이터베이스 연결 성공${NC}"
else
    echo -e "${RED}❌ 데이터베이스 연결 실패${NC}"
    echo "설정을 확인해 주세요: $ENV_FILE"
    exit 1
fi

# 마이그레이션 상태 확인
echo -e "${YELLOW}🗄️ 마이그레이션 상태 확인 중...${NC}"
if npx typeorm-ts-node-commonjs -d src/database/data-source.ts migration:show 2>/dev/null | grep -q "No pending migrations"; then
    echo -e "${GREEN}📝 마이그레이션이 최신 상태입니다${NC}"
else
    echo -e "${YELLOW}🔄 마이그레이션 실행 중...${NC}"
    if npx typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run; then
        echo -e "${GREEN}✅ 마이그레이션 완료${NC}"
    else
        echo -e "${RED}❌ 마이그레이션 실패${NC}"
        exit 1
    fi
fi

# API 서버 시작
echo -e "${GREEN}🌟 API 서버 시작 중...${NC}"
echo "================================================"
echo "API 서버 정보:"
echo "  URL: http://localhost:${PORT:-3002}"
echo "  Health Check: http://localhost:${PORT:-3002}/api/health"
echo "  API Docs: http://localhost:${PORT:-3002}/api-docs"
echo "  환경: ${NODE_ENV:-development}"
echo ""
echo "중지하려면 Ctrl+C를 누르세요"
echo "================================================"

# 개발 서버 실행
pnpm run dev