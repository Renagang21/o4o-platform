#!/bin/bash

# O4O Platform - 개발환경 Nginx 시작 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 O4O Platform 개발환경 Nginx 시작...${NC}"

# 프로젝트 루트 및 설정 파일 경로
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_CONFIG_FILE="$PROJECT_ROOT/nginx/local-dev.conf"
NGINX_PID_FILE="/var/run/nginx/nginx-o4o-dev.pid"

# 설정 파일 존재 확인
if [ ! -f "$NGINX_CONFIG_FILE" ]; then
    echo -e "${RED}❌ Nginx 설정 파일을 찾을 수 없습니다: $NGINX_CONFIG_FILE${NC}"
    echo -e "${YELLOW}설정을 먼저 실행하세요: ./scripts/nginx-dev-setup.sh${NC}"
    exit 1
fi

# 이미 실행 중인지 확인
if [ -f "$NGINX_PID_FILE" ] && kill -0 "$(cat "$NGINX_PID_FILE")" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ Nginx가 이미 실행 중입니다.${NC}"
    echo -e "${BLUE}현재 PID: $(cat "$NGINX_PID_FILE")${NC}"
    echo -e "${YELLOW}재시작하려면 'y'를 입력하세요 (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Nginx를 재시작합니다...${NC}"
        sudo nginx -s quit -c "$NGINX_CONFIG_FILE" || true
        sleep 2
    else
        echo -e "${GREEN}Nginx가 이미 실행 중입니다. 작업을 건너뜁니다.${NC}"
        exit 0
    fi
fi

# 포트 8080 사용 상태 확인
if netstat -tuln | grep -q ":8080 "; then
    echo -e "${YELLOW}⚠️ 포트 8080이 이미 사용 중입니다.${NC}"
    echo "현재 포트 8080을 사용하는 프로세스:"
    sudo netstat -tulnp | grep ":8080 " || true
    echo ""
    echo -e "${YELLOW}기존 프로세스를 종료하고 계속하시겠습니까? (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        sudo pkill -f "nginx.*8080" || true
        sleep 2
    else
        echo -e "${RED}❌ 포트 충돌로 인해 시작할 수 없습니다.${NC}"
        exit 1
    fi
fi

# 개발 서버 실행 상태 확인
echo "🔍 개발 서버 상태 확인 중..."
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s --connect-timeout 3 "http://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name (포트 $port) 실행 중${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name (포트 $port) 실행되지 않음${NC}"
        return 1
    fi
}

MAIN_SITE_OK=false
ADMIN_OK=false
API_OK=false

check_service "Main Site" 3000 && MAIN_SITE_OK=true
check_service "Admin Dashboard" 3001 && ADMIN_OK=true
check_service "API Server" 4000 && API_OK=true

# 경고 메시지
if [ "$MAIN_SITE_OK" = false ] || [ "$ADMIN_OK" = false ] || [ "$API_OK" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️ 일부 개발 서버가 실행되지 않았습니다.${NC}"
    echo -e "${BLUE}Nginx는 시작되지만, 해당 서비스로의 요청은 502 에러가 발생할 수 있습니다.${NC}"
    echo ""
    echo -e "${YELLOW}개발 서버를 먼저 시작하시겠습니까? (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}개발 서버를 시작합니다...${NC}"
        echo "다음 명령을 새 터미널에서 실행하세요:"
        echo ""
        echo -e "${GREEN}npm run dev:all${NC}    # 모든 서비스 동시 시작"
        echo "또는 개별적으로:"
        echo -e "${GREEN}npm run dev:web${NC}    # Main Site (포트 3000)"
        echo -e "${GREEN}npm run dev:admin${NC}  # Admin Dashboard (포트 3001)"
        echo -e "${GREEN}npm run dev:api${NC}    # API Server (포트 4000)"
        echo ""
        echo -e "${YELLOW}서버 시작 후 Enter를 눌러 계속하세요...${NC}"
        read -r
    fi
fi

# 로그 디렉토리 생성 확인
sudo mkdir -p /var/log/nginx
sudo mkdir -p /var/run/nginx

# 설정 파일 문법 검사
echo "🔍 설정 파일 문법 검사 중..."
if ! sudo nginx -t -c "$NGINX_CONFIG_FILE"; then
    echo -e "${RED}❌ 설정 파일에 문법 오류가 있습니다.${NC}"
    exit 1
fi

# Nginx 시작
echo -e "${BLUE}⚡ Nginx 시작 중...${NC}"
if sudo nginx -c "$NGINX_CONFIG_FILE"; then
    echo -e "${GREEN}✅ Nginx 시작 완료!${NC}"
else
    echo -e "${RED}❌ Nginx 시작 실패${NC}"
    echo "로그를 확인하세요:"
    echo "sudo tail -n 20 /var/log/nginx/o4o-dev-error.log"
    exit 1
fi

# 시작 확인
sleep 2
if [ -f "$NGINX_PID_FILE" ] && kill -0 "$(cat "$NGINX_PID_FILE")" 2>/dev/null; then
    PID=$(cat "$NGINX_PID_FILE")
    echo -e "${GREEN}🎉 Nginx가 성공적으로 시작되었습니다! (PID: $PID)${NC}"
else
    echo -e "${RED}❌ Nginx 프로세스 확인 실패${NC}"
    exit 1
fi

# 포트 8080 리스닝 확인
if netstat -tuln | grep -q ":8080 "; then
    echo -e "${GREEN}✅ 포트 8080에서 정상적으로 리스닝 중${NC}"
else
    echo -e "${RED}❌ 포트 8080에서 리스닝하지 않음${NC}"
    exit 1
fi

# 간단한 헬스체크
echo "🏥 헬스체크 수행 중..."
if curl -s "http://localhost:8080/health" | grep -q "OK"; then
    echo -e "${GREEN}✅ 헬스체크 통과${NC}"
else
    echo -e "${YELLOW}⚠️ 헬스체크 실패 (Nginx는 실행 중이지만 응답에 문제가 있을 수 있습니다)${NC}"
fi

echo ""
echo -e "${GREEN}🎯 접근 가능한 URL:${NC}"
echo -e "${BLUE}메인 사이트:      ${GREEN}http://localhost:8080${NC}"
echo -e "${BLUE}관리자 대시보드:  ${GREEN}http://localhost:8080/admin${NC}"
echo -e "${BLUE}API 엔드포인트:   ${GREEN}http://localhost:8080/api${NC}"
echo -e "${BLUE}개발 정보:        ${GREEN}http://localhost:8080/dev-info${NC}"
echo -e "${BLUE}Nginx 상태:       ${GREEN}http://localhost:8080/nginx-status${NC}"

echo ""
echo -e "${BLUE}📊 관리 명령어:${NC}"
echo -e "${GREEN}./scripts/nginx-dev-stop.sh${NC}     - Nginx 중지"
echo -e "${GREEN}./scripts/nginx-dev-reload.sh${NC}   - 설정 재로드"
echo -e "${GREEN}./scripts/nginx-dev-status.sh${NC}   - 상태 확인"

echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo "- 설정 변경 후: ./scripts/nginx-dev-reload.sh"
echo "- 로그 확인: sudo tail -f /var/log/nginx/o4o-dev-access.log"
echo "- 에러 로그: sudo tail -f /var/log/nginx/o4o-dev-error.log"

exit 0