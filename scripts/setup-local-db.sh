#!/bin/bash

# ============================================
# O4O Platform 로컬 PostgreSQL 설정 스크립트
# Docker 없이 네이티브 PostgreSQL 사용 (Ubuntu / apt)
#
# 자격정보 비노출 규칙 (WO-O4O-MIGRATION-HISTORICAL-MANIFEST-IDENTITY-AND-LOCAL-DB-CREDENTIAL-LOG-FINAL-CLOSURE-V1)
#   - 비밀번호는 stdout / stderr / 프로세스 인자 / connection URL 어디에도 출력하지 않는다
#     (SET / MISSING 만 보고). .env 파일(0600)에만 기록한다.
#   - CREATE USER 의 비밀번호는 psql 명령행 인자가 아니라 stdin(SQL) 으로만 전달한다.
#   - psql 이 실패해도 실패한 SQL 문장(비밀번호 포함)을 그대로 출력하지 않는다.
#   - 회귀 테스트: node --test scripts/db/__tests__/setup-local-db-credential-log.test.mjs
#
# 환경변수(선택):
#   LOCAL_DB_PASSWORD   로컬 DB 비밀번호 (미설정 시 기존 개발 기본값 유지 — 값은 출력하지 않음)
#   O4O_API_ENV_FILE    생성할 .env 경로 (기본: <repo>/apps/api-server/.env)
# ============================================

set -e
set +x

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
DB_PASSWORD="${LOCAL_DB_PASSWORD:-o4o_dev_password_2024}"

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Database password: MISSING${NC}"
    exit 1
fi
case "$DB_PASSWORD" in
    *"'"*|*'\'*) echo -e "${RED}❌ Database password: INVALID (single quote / backslash not allowed)${NC}"; exit 1 ;;
esac
echo "Database host: SET"
echo "Database name: SET"
echo "Database user: SET"
echo "Database password: SET"

# postgres 사용자로 데이터베이스 설정.
# 비밀번호는 stdin 의 SQL 로만 전달한다(명령행 인자 금지). psql 의 stderr 는 실패한 SQL 문장을 되풀이하므로
# 화면에 그대로 내보내지 않고 성공/실패만 보고한다.
sudo -u postgres psql -q -c "DROP DATABASE IF EXISTS $DB_NAME;" >/dev/null 2>&1 || true
sudo -u postgres psql -q -c "DROP USER IF EXISTS $DB_USER;" >/dev/null 2>&1 || true

if ! sudo -u postgres psql -q -X -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL
\\set db_pw '$DB_PASSWORD'
CREATE USER $DB_USER WITH PASSWORD :'db_pw';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL
then
    echo -e "${RED}❌ Database user/database setup: FAILED (psql error; statement not echoed — run \`sudo -u postgres psql\` manually to inspect)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 데이터베이스 설정 완료${NC}"

# .env 파일 생성
ENV_FILE="${O4O_API_ENV_FILE:-$REPO_ROOT/apps/api-server/.env}"
echo -e "${GREEN}📝 .env 파일 생성 중...${NC}"

umask 077
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

# 연결 테스트 — 비밀번호는 이 프로세스에만 적용되는 환경변수로 전달(명령행 인자 아님), 출력은 버린다
echo -e "${GREEN}🔍 데이터베이스 연결 테스트${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -w -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 데이터베이스 연결 성공${NC}"
    echo "Local database connection: SUCCESS"
else
    echo -e "${RED}❌ 데이터베이스 연결 실패${NC}"
    echo "Local database connection: FAILED"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 로컬 PostgreSQL 설정 완료!${NC}"
echo "================================================"
echo "Local database configuration: COMPLETE"
echo "  호스트: localhost:5432"
echo "  데이터베이스: $DB_NAME"
echo "  사용자: $DB_USER"
echo "  비밀번호: (출력하지 않음 — $ENV_FILE 의 DB_PASSWORD)"
echo ""
echo "다음 단계:"
echo "  1. cd apps/api-server"
echo "  2. pnpm run migration:run"
echo "  3. pnpm run dev"
echo ""
echo "데이터베이스 접속 (비밀번호는 .env 의 DB_PASSWORD 를 PGPASSWORD 환경변수로 사용):"
echo "  psql -h localhost -U $DB_USER -d $DB_NAME"
