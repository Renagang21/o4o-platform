#!/bin/bash

# O4O Platform - 통합 개발환경 시작 스크립트
# 모든 개발 서버 + Nginx API Gateway 동시 실행

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 O4O Platform 통합 개발환경 시작${NC}"
echo -e "${BLUE}========================================${NC}"

# 프로젝트 루트 확인
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}프로젝트 루트: $PROJECT_ROOT${NC}"

# 환경 확인
echo ""
echo -e "${CYAN}📋 환경 확인 중...${NC}"

# Node.js 버전 확인
NODE_VERSION=$(node --version 2>/dev/null || echo "설치되지 않음")
echo -e "${BLUE}Node.js: $NODE_VERSION${NC}"

# npm 버전 확인
NPM_VERSION=$(npm --version 2>/dev/null || echo "설치되지 않음")
echo -e "${BLUE}npm: $NPM_VERSION${NC}"

# Nginx 확인
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1 | grep -oP '(?<=nginx/)[0-9.]+')
    echo -e "${BLUE}Nginx: $NGINX_VERSION${NC}"
else
    echo -e "${RED}Nginx: 설치되지 않음${NC}"
    echo -e "${YELLOW}Nginx 설정을 먼저 실행하세요: ./scripts/nginx-dev-setup.sh${NC}"
    exit 1
fi

# 포트 사용 상태 확인
echo ""
echo -e "${CYAN}🔍 포트 사용 상태 확인...${NC}"
PORTS_TO_CHECK=(3000 3001 4000 8080)
PORTS_IN_USE=()

for port in "${PORTS_TO_CHECK[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        PORTS_IN_USE+=($port)
        echo -e "${YELLOW}⚠️ 포트 $port 사용 중${NC}"
    else
        echo -e "${GREEN}✅ 포트 $port 사용 가능${NC}"
    fi
done

# 포트 충돌 처리
if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}포트 충돌이 감지되었습니다: ${PORTS_IN_USE[*]}${NC}"
    echo -e "${BLUE}기존 프로세스를 종료하고 계속하시겠습니까? (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}기존 프로세스 종료 중...${NC}"
        
        # 개발 서버 종료
        pkill -f "vite.*3000" || true
        pkill -f "vite.*3001" || true
        pkill -f "node.*4000" || true
        
        # Nginx 종료
        ./scripts/nginx-dev-stop.sh || true
        
        sleep 3
        echo -e "${GREEN}✅ 기존 프로세스 종료 완료${NC}"
    else
        echo -e "${RED}❌ 포트 충돌로 인해 시작할 수 없습니다.${NC}"
        exit 1
    fi
fi

# 의존성 확인
echo ""
echo -e "${CYAN}📦 의존성 확인 중...${NC}"

# 루트 의존성 확인
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}루트 의존성이 설치되지 않았습니다. 설치를 진행합니다...${NC}"
    npm install
fi

# 서비스별 의존성 확인
SERVICES=("services/api-server" "services/main-site" "services/admin-dashboard")

for service in "${SERVICES[@]}"; do
    if [ -d "$service" ] && [ ! -d "$service/node_modules" ]; then
        echo -e "${YELLOW}$service 의존성 설치 중...${NC}"
        (cd "$service" && npm install)
    fi
done

echo -e "${GREEN}✅ 의존성 확인 완료${NC}"

# 개발 서버 시작 함수
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    local npm_script=$4
    local log_file="/tmp/o4o-$service_name.log"
    
    echo -e "${BLUE}🚀 $service_name 시작 중... (포트 $port)${NC}"
    
    if [ -d "$service_path" ]; then
        # 로그 파일 초기화
        > "$log_file"
        
        # 백그라운드에서 서비스 시작
        (cd "$service_path" && npm run "$npm_script" > "$log_file" 2>&1) &
        local pid=$!
        
        echo "$pid" > "/tmp/o4o-$service_name.pid"
        echo -e "${GREEN}✅ $service_name 시작됨 (PID: $pid)${NC}"
        echo -e "${BLUE}   로그: tail -f $log_file${NC}"
        
        return 0
    else
        echo -e "${RED}❌ $service_name 디렉토리를 찾을 수 없습니다: $service_path${NC}"
        return 1
    fi
}

# 서비스 시작 대기 함수
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_wait=60
    local count=0
    
    echo -n "  $service_name 시작 대기 중"
    
    while [ $count -lt $max_wait ]; do
        if curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
            echo -e " ${GREEN}✅${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        count=$((count + 2))
    done
    
    echo -e " ${RED}❌ 타임아웃${NC}"
    return 1
}

# 개발 서버들 시작
echo ""
echo -e "${CYAN}🔧 개발 서버 시작 중...${NC}"

# API Server 시작
start_service "api-server" "services/api-server" 4000 "dev"

# Main Site 시작  
start_service "main-site" "services/main-site" 3000 "dev"

# Admin Dashboard 시작
start_service "admin-dashboard" "services/admin-dashboard" 3001 "dev"

# 서비스 시작 대기
echo ""
echo -e "${CYAN}⏳ 서비스 시작 대기 중...${NC}"
wait_for_service "API Server" 4000
wait_for_service "Main Site" 3000  
wait_for_service "Admin Dashboard" 3001

# Nginx 시작
echo ""
echo -e "${CYAN}🌐 Nginx API Gateway 시작 중...${NC}"
if ./scripts/nginx-dev-start.sh; then
    echo -e "${GREEN}✅ Nginx 시작 완료${NC}"
else
    echo -e "${RED}❌ Nginx 시작 실패${NC}"
    echo "개발 서버들은 개별 포트에서 접근 가능합니다:"
    echo -e "${BLUE}Main Site: http://localhost:3000${NC}"
    echo -e "${BLUE}Admin Dashboard: http://localhost:3001${NC}"
    echo -e "${BLUE}API Server: http://localhost:4000${NC}"
fi

# 최종 상태 확인
echo ""
echo -e "${PURPLE}🎉 O4O Platform 통합 개발환경 시작 완료!${NC}"
echo -e "${BLUE}============================================${NC}"

# 접근 URL 정보
echo ""
echo -e "${GREEN}🎯 통합 접근 URL (Nginx Gateway):${NC}"
echo -e "${CYAN}메인 사이트:      ${GREEN}http://localhost:8080${NC}"
echo -e "${CYAN}관리자 대시보드:  ${GREEN}http://localhost:8080/admin${NC}"
echo -e "${CYAN}API 엔드포인트:   ${GREEN}http://localhost:8080/api${NC}"
echo -e "${CYAN}개발 정보:        ${GREEN}http://localhost:8080/dev-info${NC}"

echo ""
echo -e "${BLUE}🔗 개별 접근 URL (직접 연결):${NC}"
echo -e "${CYAN}Main Site:        ${YELLOW}http://localhost:3000${NC}"
echo -e "${CYAN}Admin Dashboard:  ${YELLOW}http://localhost:3001${NC}"
echo -e "${CYAN}API Server:       ${YELLOW}http://localhost:4000${NC}"

# 관리 명령어 안내
echo ""
echo -e "${BLUE}📋 관리 명령어:${NC}"
echo -e "${GREEN}./scripts/nginx-dev-stop.sh${NC}      - Nginx만 중지"
echo -e "${GREEN}./scripts/nginx-dev-reload.sh${NC}    - Nginx 설정 재로드"
echo -e "${GREEN}./scripts/dev-stop-all.sh${NC}        - 모든 서비스 중지"

# 로그 모니터링 안내
echo ""
echo -e "${BLUE}📊 로그 모니터링:${NC}"
echo -e "${GREEN}tail -f /tmp/o4o-api-server.log${NC}     # API Server 로그"
echo -e "${GREEN}tail -f /tmp/o4o-main-site.log${NC}      # Main Site 로그" 
echo -e "${GREEN}tail -f /tmp/o4o-admin-dashboard.log${NC} # Admin Dashboard 로그"
echo -e "${GREEN}sudo tail -f /var/log/nginx/o4o-dev-access.log${NC} # Nginx 접근 로그"

# PID 파일 정보
echo ""
echo -e "${BLUE}🔍 프로세스 정보:${NC}"
for service in "api-server" "main-site" "admin-dashboard"; do
    if [ -f "/tmp/o4o-$service.pid" ]; then
        pid=$(cat "/tmp/o4o-$service.pid")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}✅ $service: 실행 중 (PID: $pid)${NC}"
        else
            echo -e "${RED}❌ $service: 프로세스 없음 (PID: $pid)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ $service: PID 파일 없음${NC}"
    fi
done

# 개발 팁
echo ""
echo -e "${PURPLE}💡 개발 팁:${NC}"
echo "• 코드 변경 시 Vite가 자동으로 핫 리로드됩니다"
echo "• API 서버는 nodemon을 통해 자동 재시작됩니다"
echo "• Nginx 설정 변경 후: ./scripts/nginx-dev-reload.sh"
echo "• 전체 재시작: Ctrl+C로 중지 후 다시 실행"

# 종료 트랩 설정
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 정리 작업 중...${NC}"
    
    # PID 파일들 확인하고 프로세스 종료
    for service in "api-server" "main-site" "admin-dashboard"; do
        if [ -f "/tmp/o4o-$service.pid" ]; then
            pid=$(cat "/tmp/o4o-$service.pid")
            if kill -0 "$pid" 2>/dev/null; then
                echo "  $service 종료 중... (PID: $pid)"
                kill "$pid" 2>/dev/null || true
            fi
            rm -f "/tmp/o4o-$service.pid"
        fi
    done
    
    # Nginx 종료
    ./scripts/nginx-dev-stop.sh || true
    
    echo -e "${GREEN}✅ 정리 완료${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 메인 루프 - 키 입력 대기
echo ""
echo -e "${CYAN}⌨️ 명령어를 입력하세요 (h: 도움말, q: 종료):${NC}"

while true; do
    read -p "> " command
    case $command in
        "h"|"help")
            echo ""
            echo -e "${BLUE}사용 가능한 명령어:${NC}"
            echo "  h, help     - 이 도움말 표시"
            echo "  q, quit     - 모든 서비스 종료"
            echo "  status      - 서비스 상태 확인" 
            echo "  reload      - Nginx 설정 재로드"
            echo "  logs        - 로그 파일 위치 표시"
            echo "  urls        - 접근 URL 다시 표시"
            ;;
        "q"|"quit"|"exit")
            cleanup
            ;;
        "status")
            echo ""
            echo -e "${BLUE}📊 서비스 상태:${NC}"
            for service in "api-server" "main-site" "admin-dashboard"; do
                if [ -f "/tmp/o4o-$service.pid" ]; then
                    pid=$(cat "/tmp/o4o-$service.pid")
                    if kill -0 "$pid" 2>/dev/null; then
                        echo -e "${GREEN}✅ $service: 실행 중 (PID: $pid)${NC}"
                    else
                        echo -e "${RED}❌ $service: 프로세스 없음${NC}"
                    fi
                else
                    echo -e "${YELLOW}⚠️ $service: PID 파일 없음${NC}"
                fi
            done
            
            if [ -f "/var/run/nginx/nginx-o4o-dev.pid" ]; then
                nginx_pid=$(cat "/var/run/nginx/nginx-o4o-dev.pid")
                if kill -0 "$nginx_pid" 2>/dev/null; then
                    echo -e "${GREEN}✅ Nginx: 실행 중 (PID: $nginx_pid)${NC}"
                else
                    echo -e "${RED}❌ Nginx: 프로세스 없음${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️ Nginx: PID 파일 없음${NC}"
            fi
            ;;
        "reload")
            ./scripts/nginx-dev-reload.sh
            ;;
        "logs")
            echo ""
            echo -e "${BLUE}📊 로그 파일 위치:${NC}"
            echo -e "${GREEN}/tmp/o4o-api-server.log${NC}"
            echo -e "${GREEN}/tmp/o4o-main-site.log${NC}"
            echo -e "${GREEN}/tmp/o4o-admin-dashboard.log${NC}"
            echo -e "${GREEN}/var/log/nginx/o4o-dev-access.log${NC}"
            echo -e "${GREEN}/var/log/nginx/o4o-dev-error.log${NC}"
            ;;
        "urls")
            echo ""
            echo -e "${GREEN}🎯 통합 접근 URL:${NC}"
            echo -e "${CYAN}메인 사이트:      ${GREEN}http://localhost:8080${NC}"
            echo -e "${CYAN}관리자 대시보드:  ${GREEN}http://localhost:8080/admin${NC}"
            echo -e "${CYAN}API 엔드포인트:   ${GREEN}http://localhost:8080/api${NC}"
            ;;
        "")
            # 빈 입력 무시
            ;;
        *)
            echo -e "${YELLOW}알 수 없는 명령어입니다. 'h' 또는 'help'를 입력하세요.${NC}"
            ;;
    esac
done