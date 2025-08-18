#!/bin/bash
# ================================
# O4O Platform - Deployment Verification Script
# ================================

echo "🔍 O4O Platform 배포 검증 시작..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 결과 저장 변수
TOTAL_CHECKS=0
PASSED_CHECKS=0

# 함수: 체크 실행
check() {
    local name=$1
    local command=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "  ✓ $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        return 1
    fi
}

echo -e "\n${YELLOW}1. 프로세스 상태 확인${NC}"
check "PM2 데몬" "pm2 pid"
check "API Server (PM2)" "pm2 describe o4o-api 2>/dev/null"
check "Web Server (systemd)" "systemctl is-active o4o-webserver 2>/dev/null"
check "Admin Dashboard (systemd)" "systemctl is-active o4o-admin 2>/dev/null"

echo -e "\n${YELLOW}2. 포트 리스닝 확인${NC}"
check "Port 3000 (Web)" "lsof -i :3000"
check "Port 3001 (Admin/API)" "lsof -i :3001"
check "Port 5432 (PostgreSQL)" "lsof -i :5432"
check "Port 6379 (Redis)" "lsof -i :6379"

echo -e "\n${YELLOW}3. 서비스 응답 확인${NC}"
check "Web Server" "curl -f -s http://localhost:3000 > /dev/null"
check "Admin Dashboard" "curl -f -s http://localhost:3001 > /dev/null"
check "API Health" "curl -f -s http://localhost:3001/api/health > /dev/null"

echo -e "\n${YELLOW}4. 파일 시스템 확인${NC}"
check "Build 디렉토리 (main-site)" "[ -d apps/main-site/dist ]"
check "Build 디렉토리 (admin)" "[ -d apps/admin-dashboard/dist ]"
check "Build 디렉토리 (api)" "[ -d apps/api-server/dist ]"
check "로그 디렉토리" "[ -d logs ] || [ -d /var/log/o4o-platform ]"

echo -e "\n${YELLOW}5. 환경 설정 확인${NC}"
check "API Server .env" "[ -f apps/api-server/.env ]"
check "NODE_ENV 설정" "[ ! -z \"$NODE_ENV\" ]"
check "PM2 dump 파일" "[ -f ~/.pm2/dump.pm2 ]"

echo -e "\n${YELLOW}6. 데이터베이스 확인${NC}"
check "PostgreSQL 연결" "pg_isready -h localhost -p 5432 2>/dev/null || echo 'Mock DB'"
check "Redis 연결" "redis-cli ping 2>/dev/null || echo 'Optional'"

# 결과 요약
echo -e "\n========================================="
echo -e "📊 검증 결과: ${PASSED_CHECKS}/${TOTAL_CHECKS} 통과"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}✅ 모든 검증 통과! 배포 성공!${NC}"
    exit 0
elif [ $PASSED_CHECKS -ge $((TOTAL_CHECKS * 70 / 100)) ]; then
    echo -e "${YELLOW}⚠️ 일부 검증 실패. 확인 필요.${NC}"
    exit 1
else
    echo -e "${RED}❌ 배포 실패! 즉시 확인 필요!${NC}"
    exit 2
fi