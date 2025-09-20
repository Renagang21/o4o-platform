#!/bin/bash

# ============================================
# O4O Platform 로컬 PostgreSQL 설정 스크립트
# Docker 없이 네이티브 PostgreSQL 사용
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🐘 O4O Platform 로컬 PostgreSQL 설정${NC}"
echo "================================================"

# PostgreSQL 설치 확인
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}📥 PostgreSQL 설치 중...${NC}"
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    
    # PostgreSQL 서비스 시작
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    echo -e "${GREEN}✅ PostgreSQL 설치 완료${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL 이미 설치됨${NC}"
fi

# PostgreSQL 서비스 상태 확인
if ! sudo systemctl is-active --quiet postgresql; then
    echo -e "${YELLOW}🔄 PostgreSQL 서비스 시작 중...${NC}"
    sudo systemctl start postgresql
fi

# 데이터베이스 및 사용자 설정
echo -e "${GREEN}🔐 데이터베이스 설정 중...${NC}"

DB_NAME="o4o_platform"
DB_USER="o4o_user"
DB_PASSWORD="o4o_dev_password_2024"

# postgres 사용자로 데이터베이스 설정
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo -e "${GREEN}✅ 데이터베이스 설정 완료${NC}"

# .env 파일 생성
ENV_FILE="/home/sohae21/o4o-platform/apps/api-server/.env"
echo -e "${GREEN}📝 .env 파일 생성 중...${NC}"

cat > "$ENV_FILE" << EOF
# ================================
# O4O Platform - API Server Local Environment
# 자동 생성된 로컬 개발용 설정
# ================================

# === 서버 기본 설정 ===
NODE_ENV=development
SERVER_TYPE=apiserver
PORT=3002

# === 데이터베이스 (PostgreSQL) ===
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# === 보안 및 인증 (개발용) ===
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=dev-session-secret-change-in-production

# === 개발 모드 설정 ===
BYPASS_AUTH=false

# === CORS 설정 ===
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174,https://neture.co.kr,https://admin.neture.co.kr
CORS_CREDENTIALS=true

# === 이메일 서비스 (개발환경 비활성화) ===
EMAIL_SERVICE_ENABLED=false

# === Redis (개발환경 비활성화) ===
REDIS_ENABLED=false

# === 파일 업로드 ===
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_DIR=./uploads

# === 로깅 ===
LOG_LEVEL=debug
LOG_DIR=./logs

# === 모니터링 ===
MONITORING_ENABLED=true
HEALTH_CHECK_PATH=/api/health

# === API 문서 ===
SWAGGER_ENABLED=true
API_DOCS_PATH=/api-docs
EOF

chmod 600 "$ENV_FILE"
echo -e "${GREEN}✅ .env 파일 생성 완료: $ENV_FILE${NC}"

# 연결 테스트
echo -e "${GREEN}🔍 데이터베이스 연결 테스트${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 데이터베이스 연결 성공${NC}"
else
    echo -e "${RED}❌ 데이터베이스 연결 실패${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 로컬 PostgreSQL 설정 완료!${NC}"
echo "================================================"
echo "데이터베이스 정보:"
echo "  호스트: localhost:5432"
echo "  데이터베이스: $DB_NAME"
echo "  사용자: $DB_USER"
echo "  비밀번호: $DB_PASSWORD"
echo ""
echo "다음 단계:"
echo "  1. cd apps/api-server"
echo "  2. pnpm run migration:run"
echo "  3. pnpm run dev"
echo ""
echo "데이터베이스 접속:"
echo "  psql -h localhost -U $DB_USER -d $DB_NAME"