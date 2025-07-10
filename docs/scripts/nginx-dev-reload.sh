#!/bin/bash

# O4O Platform - 개발환경 Nginx 설정 재로드 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 O4O Platform 개발환경 Nginx 설정 재로드...${NC}"

# 프로젝트 루트 및 설정 파일 경로
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_CONFIG_FILE="$PROJECT_ROOT/nginx/local-dev.conf"
NGINX_PID_FILE="/var/run/nginx/nginx-o4o-dev.pid"

# 설정 파일 존재 확인
if [ ! -f "$NGINX_CONFIG_FILE" ]; then
    echo -e "${RED}❌ Nginx 설정 파일을 찾을 수 없습니다: $NGINX_CONFIG_FILE${NC}"
    exit 1
fi

# Nginx 실행 상태 확인
if [ ! -f "$NGINX_PID_FILE" ] || ! kill -0 "$(cat "$NGINX_PID_FILE")" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ Nginx가 실행되지 않았습니다.${NC}"
    echo -e "${BLUE}시작하시겠습니까? (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        exec "./scripts/nginx-dev-start.sh"
    else
        echo -e "${YELLOW}재로드를 취소합니다.${NC}"
        exit 0
    fi
fi

PID=$(cat "$NGINX_PID_FILE")
echo -e "${BLUE}현재 실행 중인 Nginx PID: $PID${NC}"

# 설정 파일 문법 검사
echo "🔍 설정 파일 문법 검사 중..."
if ! sudo nginx -t -c "$NGINX_CONFIG_FILE"; then
    echo -e "${RED}❌ 설정 파일에 문법 오류가 있습니다.${NC}"
    echo "재로드를 취소합니다."
    exit 1
fi

echo -e "${GREEN}✅ 설정 파일 문법 검사 통과${NC}"

# 설정 변경사항 확인 (선택적)
echo -e "${BLUE}📋 최근 설정 파일 수정 시간: $(stat -c %y "$NGINX_CONFIG_FILE")${NC}"

# 재로드 실행
echo -e "${BLUE}⚡ 설정 재로드 중...${NC}"
if sudo nginx -s reload -c "$NGINX_CONFIG_FILE"; then
    echo -e "${GREEN}✅ 설정 재로드 완료!${NC}"
else
    echo -e "${RED}❌ 설정 재로드 실패${NC}"
    echo "에러 로그를 확인하세요:"
    echo "sudo tail -n 10 /var/log/nginx/o4o-dev-error.log"
    exit 1
fi

# 재로드 후 상태 확인
sleep 2

# 프로세스가 여전히 실행 중인지 확인
if kill -0 "$PID" 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx 프로세스가 정상적으로 유지되고 있습니다.${NC}"
else
    echo -e "${RED}❌ 재로드 후 Nginx 프로세스가 종료되었습니다.${NC}"
    echo "설정에 오류가 있을 가능성이 높습니다."
    echo "에러 로그 확인: sudo tail -n 20 /var/log/nginx/o4o-dev-error.log"
    exit 1
fi

# 포트 확인
if netstat -tuln | grep -q ":8080 "; then
    echo -e "${GREEN}✅ 포트 8080에서 정상적으로 리스닝 중${NC}"
else
    echo -e "${RED}❌ 포트 8080에서 리스닝하지 않음${NC}"
    exit 1
fi

# 간단한 헬스체크
echo "🏥 헬스체크 수행 중..."
if curl -s --connect-timeout 5 "http://localhost:8080/health" | grep -q "OK"; then
    echo -e "${GREEN}✅ 헬스체크 통과${NC}"
else
    echo -e "${YELLOW}⚠️ 헬스체크 실패${NC}"
    echo "응답 확인:"
    curl -s --connect-timeout 5 "http://localhost:8080/health" || echo "연결 실패"
fi

# 업스트림 서버 연결 확인
echo ""
echo -e "${BLUE}🔍 업스트림 서버 연결 확인:${NC}"

check_upstream() {
    local name=$1
    local port=$2
    local path=$3
    
    echo -n "  $name (포트 $port): "
    if curl -s --connect-timeout 3 "http://localhost:8080$path" > /dev/null 2>&1; then
        echo -e "${GREEN}연결 성공${NC}"
    else
        echo -e "${RED}연결 실패${NC}"
        # 직접 업스트림 서버 확인
        if curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "    ${YELLOW}→ 업스트림 서버는 실행 중, 프록시 설정 확인 필요${NC}"
        else
            echo -e "    ${YELLOW}→ 업스트림 서버가 실행되지 않음${NC}"
        fi
    fi
}

check_upstream "Main Site" 3000 "/"
check_upstream "Admin Dashboard" 3001 "/admin/"
check_upstream "API Server" 4000 "/api/health"

echo ""
echo -e "${GREEN}🎉 설정 재로드 완료!${NC}"

# 접근 URL 안내
echo ""
echo -e "${GREEN}🎯 접근 가능한 URL:${NC}"
echo -e "${BLUE}메인 사이트:      ${GREEN}http://localhost:8080${NC}"
echo -e "${BLUE}관리자 대시보드:  ${GREEN}http://localhost:8080/admin${NC}"
echo -e "${BLUE}API 엔드포인트:   ${GREEN}http://localhost:8080/api${NC}"
echo -e "${BLUE}개발 정보:        ${GREEN}http://localhost:8080/dev-info${NC}"

# 로그 모니터링 안내
echo ""
echo -e "${BLUE}📊 로그 모니터링:${NC}"
echo -e "${GREEN}sudo tail -f /var/log/nginx/o4o-dev-access.log${NC}  # 접근 로그"
echo -e "${GREEN}sudo tail -f /var/log/nginx/o4o-dev-error.log${NC}   # 에러 로그"

# 추가 관리 명령어
echo ""
echo -e "${BLUE}📋 관리 명령어:${NC}"
echo -e "${GREEN}./scripts/nginx-dev-stop.sh${NC}     - Nginx 중지"
echo -e "${GREEN}./scripts/nginx-dev-status.sh${NC}   - 상태 확인"

exit 0