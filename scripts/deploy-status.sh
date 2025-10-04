#!/bin/bash

# O4O Platform Deployment Status Check Script
# 배포된 서비스들의 상태를 확인하는 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# 서버 정보
API_HOST="43.202.242.215"
WEB_HOST="13.125.144.8"
USER="ubuntu"

print_header() {
    echo -e "\n${BOLD}${BLUE}=================================${NC}"
    echo -e "${BOLD}${BLUE}  O4O Platform 서비스 상태${NC}"
    echo -e "${BOLD}${BLUE}=================================${NC}\n"
}

check_service() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 $name 확인 중... "
    
    if command -v curl >/dev/null 2>&1; then
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10 --max-time 30 || echo "000")
        
        if [ "$status_code" = "$expected_status" ]; then
            echo -e "${GREEN}✅ 정상 (HTTP $status_code)${NC}"
            return 0
        else
            echo -e "${RED}❌ 실패 (HTTP $status_code)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  curl이 설치되지 않음${NC}"
        return 1
    fi
}

check_ssh_connection() {
    local host=$1
    local name=$2
    
    echo -n "🔗 $name SSH 연결 확인 중... "
    
    if ssh -o ConnectTimeout=5 -o BatchMode=yes ${USER}@${host} "echo 'OK'" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 연결 가능${NC}"
        return 0
    else
        echo -e "${RED}❌ 연결 실패${NC}"
        return 1
    fi
}

check_api_server_processes() {
    echo "🖥️  API 서버 프로세스 확인..."
    
    if ssh -o ConnectTimeout=5 ${USER}@${API_HOST} "pm2 list | grep -q 'o4o-api'" 2>/dev/null; then
        echo -e "   ${GREEN}✅ PM2 프로세스 실행 중${NC}"
        
        # PM2 상태 자세히 보기
        echo "   📊 PM2 상태:"
        ssh ${USER}@${API_HOST} "pm2 list | grep -E '(App name|o4o-api)'" 2>/dev/null | sed 's/^/      /' || true
    else
        echo -e "   ${RED}❌ PM2 프로세스 없음${NC}"
    fi
}

check_web_server_processes() {
    echo "🌐 웹 서버 프로세스 확인..."
    
    if ssh -o ConnectTimeout=5 ${USER}@${WEB_HOST} "sudo systemctl is-active nginx" >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Nginx 실행 중${NC}"
    else
        echo -e "   ${RED}❌ Nginx 중지됨${NC}"
    fi
    
    # 웹 디렉토리 확인
    if ssh -o ConnectTimeout=5 ${USER}@${WEB_HOST} "[ -d '/var/www/admin.neture.co.kr' ] && [ -f '/var/www/admin.neture.co.kr/index.html' ]" 2>/dev/null; then
        echo -e "   ${GREEN}✅ Admin Dashboard 파일 존재${NC}"
    else
        echo -e "   ${RED}❌ Admin Dashboard 파일 없음${NC}"
    fi
}

check_deployment_logs() {
    echo "📝 최근 배포 로그 확인..."
    
    local log_dir="$HOME/.o4o-deploy-logs"
    if [ -d "$log_dir" ]; then
        local latest_log=$(ls -t "$log_dir"/deploy-*.log 2>/dev/null | head -1)
        if [ -n "$latest_log" ]; then
            local log_date=$(stat -c %y "$latest_log" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
            echo -e "   ${BLUE}📅 최근 배포: $log_date${NC}"
            echo -e "   ${BLUE}📄 로그 파일: $latest_log${NC}"
        else
            echo -e "   ${YELLOW}⚠️  배포 로그 없음${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️  배포 로그 디렉토리 없음${NC}"
    fi
}

check_git_status() {
    echo "📦 Git 상태 확인..."
    
    cd "$(dirname "$0")/.."
    
    local branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    local commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local status=$(git status --porcelain 2>/dev/null | wc -l)
    
    echo -e "   ${BLUE}🌿 현재 브랜치: $branch${NC}"
    echo -e "   ${BLUE}📝 현재 커밋: $commit${NC}"
    
    if [ "$status" -eq 0 ]; then
        echo -e "   ${GREEN}✅ 작업 디렉토리 깨끗함${NC}"
    else
        echo -e "   ${YELLOW}⚠️  커밋되지 않은 변경사항: $status개${NC}"
    fi
}

main() {
    print_header
    
    # 1. 웹 서비스 상태 확인
    echo "${BOLD}🌍 웹 서비스 상태${NC}"
    check_service "https://admin.neture.co.kr" "Admin Dashboard"
    check_service "https://api.neture.co.kr/health" "API Server Health"
    check_service "https://neture.co.kr" "Main Website"
    echo ""
    
    # 2. SSH 연결 상태 확인
    echo "${BOLD}🔗 SSH 연결 상태${NC}"
    check_ssh_connection "$API_HOST" "API 서버"
    check_ssh_connection "$WEB_HOST" "웹 서버"
    echo ""
    
    # 3. 서버 프로세스 상태 확인
    echo "${BOLD}🖥️  서버 프로세스 상태${NC}"
    check_api_server_processes
    check_web_server_processes
    echo ""
    
    # 4. 배포 정보 확인
    echo "${BOLD}📋 배포 정보${NC}"
    check_deployment_logs
    check_git_status
    echo ""
    
    # 5. 요약
    echo "${BOLD}📊 요약${NC}"
    echo -e "   ${BLUE}• API Server: https://api.neture.co.kr${NC}"
    echo -e "   ${BLUE}• Admin Dashboard: https://admin.neture.co.kr${NC}"
    echo -e "   ${BLUE}• Main Website: https://neture.co.kr${NC}"
    echo ""
    echo -e "${GREEN}상태 확인 완료!${NC}"
}

main "$@"