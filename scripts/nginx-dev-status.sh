#!/bin/bash

# O4O Platform - 개발환경 Nginx 상태 확인 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}📊 O4O Platform 개발환경 상태 확인${NC}"
echo -e "${BLUE}=====================================${NC}"

# 프로젝트 루트 확인
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_CONFIG_FILE="$PROJECT_ROOT/nginx/local-dev.conf"
NGINX_PID_FILE="/var/run/nginx/nginx-o4o-dev.pid"

echo -e "${BLUE}프로젝트 루트: $PROJECT_ROOT${NC}"
echo -e "${BLUE}시간: $(date)${NC}"

# Nginx 프로세스 상태
echo ""
echo -e "${CYAN}🌐 Nginx 상태:${NC}"

if [ -f "$NGINX_PID_FILE" ]; then
    PID=$(cat "$NGINX_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${GREEN}✅ 실행 중 (PID: $PID)${NC}"
        
        # 프로세스 정보
        echo -e "${BLUE}   시작 시간: $(ps -o lstart= -p "$PID")${NC}"
        echo -e "${BLUE}   실행 시간: $(ps -o etime= -p "$PID")${NC}"
        echo -e "${BLUE}   메모리 사용: $(ps -o rss= -p "$PID" | awk '{print $1/1024 " MB"}')${NC}"
    else
        echo -e "${RED}❌ PID 파일 존재하지만 프로세스 없음 (PID: $PID)${NC}"
        echo -e "${YELLOW}   PID 파일을 정리해야 할 수 있습니다.${NC}"
    fi
else
    echo -e "${RED}❌ 실행되지 않음 (PID 파일 없음)${NC}"
fi

# 포트 리스닝 상태
echo ""
echo -e "${CYAN}🔌 포트 상태:${NC}"

check_port() {
    local port=$1
    local service_name=$2
    
    if netstat -tuln | grep -q ":$port "; then
        local process=$(sudo netstat -tulnp | grep ":$port " | awk '{print $7}' | head -n1)
        echo -e "${GREEN}✅ 포트 $port ($service_name): 리스닝 중${NC}"
        if [ -n "$process" ]; then
            echo -e "${BLUE}   프로세스: $process${NC}"
        fi
    else
        echo -e "${RED}❌ 포트 $port ($service_name): 리스닝하지 않음${NC}"
    fi
}

check_port 8080 "Nginx Gateway"
check_port 3000 "Main Site"
check_port 3001 "Admin Dashboard"
check_port 4000 "API Server"

# 설정 파일 상태
echo ""
echo -e "${CYAN}📋 설정 파일:${NC}"

if [ -f "$NGINX_CONFIG_FILE" ]; then
    echo -e "${GREEN}✅ 설정 파일 존재: $NGINX_CONFIG_FILE${NC}"
    echo -e "${BLUE}   수정 시간: $(stat -c %y "$NGINX_CONFIG_FILE")${NC}"
    echo -e "${BLUE}   크기: $(stat -c %s "$NGINX_CONFIG_FILE") bytes${NC}"
    
    # 설정 파일 문법 검사
    echo -n "   문법 검사: "
    if sudo nginx -t -c "$NGINX_CONFIG_FILE" 2>/dev/null; then
        echo -e "${GREEN}통과${NC}"
    else
        echo -e "${RED}실패${NC}"
    fi
else
    echo -e "${RED}❌ 설정 파일 없음: $NGINX_CONFIG_FILE${NC}"
fi

# 로그 파일 상태
echo ""
echo -e "${CYAN}📄 로그 파일:${NC}"

check_log_file() {
    local log_file=$1
    local log_name=$2
    
    if [ -f "$log_file" ]; then
        local size=$(stat -c %s "$log_file")
        local modified=$(stat -c %y "$log_file")
        echo -e "${GREEN}✅ $log_name: 존재${NC}"
        echo -e "${BLUE}   위치: $log_file${NC}"
        echo -e "${BLUE}   크기: $size bytes${NC}"
        echo -e "${BLUE}   수정: $modified${NC}"
        
        # 최근 에러 확인 (에러 로그인 경우)
        if [[ "$log_file" == *"error"* ]] && [ -s "$log_file" ]; then
            local recent_errors=$(tail -n 5 "$log_file" | grep -c "error\|Error\|ERROR" || true)
            if [ "$recent_errors" -gt 0 ]; then
                echo -e "${YELLOW}   ⚠️ 최근 에러 $recent_errors건 발견${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️ $log_name: 없음 ($log_file)${NC}"
    fi
}

check_log_file "/var/log/nginx/o4o-dev-access.log" "접근 로그"
check_log_file "/var/log/nginx/o4o-dev-error.log" "에러 로그"

# 업스트림 서버 연결 테스트
echo ""
echo -e "${CYAN}🔍 업스트림 서버 연결 테스트:${NC}"

test_endpoint() {
    local url=$1
    local name=$2
    local timeout=${3:-5}
    
    echo -n "  $name: "
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}" --connect-timeout "$timeout" "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    local http_code="${response: -3}"
    local body="${response%???}"
    
    case $http_code in
        "200"|"201"|"204")
            echo -e "${GREEN}성공 (${http_code}) - ${response_time}ms${NC}"
            ;;
        "404"|"405")
            echo -e "${YELLOW}접근 가능 (${http_code}) - ${response_time}ms${NC}"
            ;;
        "502"|"503"|"504")
            echo -e "${RED}업스트림 에러 (${http_code}) - ${response_time}ms${NC}"
            ;;
        "000")
            echo -e "${RED}연결 실패 - 타임아웃${NC}"
            ;;
        *)
            echo -e "${YELLOW}응답 (${http_code}) - ${response_time}ms${NC}"
            ;;
    esac
}

# Nginx Gateway를 통한 테스트
if netstat -tuln | grep -q ":8080 "; then
    echo -e "${BLUE}  [Nginx Gateway를 통한 접근]:${NC}"
    test_endpoint "http://localhost:8080/health" "헬스체크"
    test_endpoint "http://localhost:8080/" "메인 사이트"
    test_endpoint "http://localhost:8080/admin/" "관리자 대시보드"
    test_endpoint "http://localhost:8080/api/health" "API 서버"
    test_endpoint "http://localhost:8080/dev-info" "개발 정보"
fi

# 직접 업스트림 서버 테스트
echo -e "${BLUE}  [직접 업스트림 서버 접근]:${NC}"
test_endpoint "http://localhost:3000" "Main Site (직접)"
test_endpoint "http://localhost:3001" "Admin Dashboard (직접)"
test_endpoint "http://localhost:4000" "API Server (직접)"

# 개발 서비스 PID 확인
echo ""
echo -e "${CYAN}🔧 개발 서비스 상태:${NC}"

check_dev_service() {
    local service_name=$1
    local pid_file="/tmp/o4o-$service_name.pid"
    local log_file="/tmp/o4o-$service_name.log"
    
    echo -e "${BLUE}  $service_name:${NC}"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}    ✅ 실행 중 (PID: $pid)${NC}"
            local cpu_mem=$(ps -o %cpu,%mem -p "$pid" --no-headers)
            echo -e "${BLUE}    CPU/MEM: $cpu_mem${NC}"
        else
            echo -e "${RED}    ❌ 프로세스 없음 (PID: $pid)${NC}"
        fi
    else
        echo -e "${YELLOW}    ⚠️ PID 파일 없음${NC}"
    fi
    
    if [ -f "$log_file" ]; then
        local log_size=$(stat -c %s "$log_file")
        echo -e "${BLUE}    로그: $log_size bytes${NC}"
    else
        echo -e "${YELLOW}    로그 파일 없음${NC}"
    fi
}

check_dev_service "api-server"
check_dev_service "main-site"
check_dev_service "admin-dashboard"

# 시스템 리소스
echo ""
echo -e "${CYAN}💻 시스템 리소스:${NC}"

# 메모리 사용량
MEM_INFO=$(free -h | grep "Mem:")
echo -e "${BLUE}  메모리: $MEM_INFO${NC}"

# 디스크 사용량 (로그 디렉토리)
DISK_INFO=$(df -h /var/log 2>/dev/null | tail -1 || echo "정보 없음")
echo -e "${BLUE}  디스크 (/var/log): $DISK_INFO${NC}"

# 전체 요약
echo ""
echo -e "${PURPLE}📊 상태 요약:${NC}"
echo -e "${BLUE}================================${NC}"

# 전체 상태 점수 계산
total_score=0
max_score=10

# Nginx 실행 상태 (2점)
if [ -f "$NGINX_PID_FILE" ] && kill -0 "$(cat "$NGINX_PID_FILE")" 2>/dev/null; then
    total_score=$((total_score + 2))
    echo -e "${GREEN}✅ Nginx: 정상${NC}"
else
    echo -e "${RED}❌ Nginx: 비정상${NC}"
fi

# 포트 8080 리스닝 (2점)
if netstat -tuln | grep -q ":8080 "; then
    total_score=$((total_score + 2))
    echo -e "${GREEN}✅ Gateway 포트: 정상${NC}"
else
    echo -e "${RED}❌ Gateway 포트: 비정상${NC}"
fi

# 업스트림 서버들 (각 2점)
for port in 3000 3001 4000; do
    if curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
        total_score=$((total_score + 2))
        echo -e "${GREEN}✅ 포트 $port: 정상${NC}"
    else
        echo -e "${RED}❌ 포트 $port: 비정상${NC}"
    fi
done

# 점수에 따른 상태 표시
echo ""
percentage=$((total_score * 100 / max_score))
if [ $percentage -ge 80 ]; then
    echo -e "${GREEN}🎉 전체 상태: 우수 ($total_score/$max_score, $percentage%)${NC}"
elif [ $percentage -ge 60 ]; then
    echo -e "${YELLOW}⚠️ 전체 상태: 보통 ($total_score/$max_score, $percentage%)${NC}"
else
    echo -e "${RED}🚨 전체 상태: 불량 ($total_score/$max_score, $percentage%)${NC}"
fi

# 권장 액션
echo ""
echo -e "${BLUE}💡 권장 액션:${NC}"

if [ $total_score -lt $max_score ]; then
    if ! netstat -tuln | grep -q ":8080 "; then
        echo -e "${YELLOW}• Nginx 시작: ./scripts/nginx-dev-start.sh${NC}"
    fi
    
    for port in 3000 3001 4000; do
        if ! curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
            case $port in
                3000) echo -e "${YELLOW}• Main Site 시작: npm run dev:web${NC}" ;;
                3001) echo -e "${YELLOW}• Admin Dashboard 시작: npm run dev:admin${NC}" ;;
                4000) echo -e "${YELLOW}• API Server 시작: npm run dev:api${NC}" ;;
            esac
        fi
    done
    
    echo -e "${YELLOW}• 모든 서비스 통합 시작: ./scripts/dev-with-nginx.sh${NC}"
else
    echo -e "${GREEN}• 모든 서비스가 정상적으로 실행 중입니다!${NC}"
    echo -e "${BLUE}• 접속 URL: http://localhost:8080${NC}"
fi

echo ""
echo -e "${BLUE}📋 추가 명령어:${NC}"
echo -e "${GREEN}./scripts/nginx-dev-reload.sh${NC}    - 설정 재로드"
echo -e "${GREEN}./scripts/nginx-dev-stop.sh${NC}      - Nginx 중지"
echo -e "${GREEN}sudo tail -f /var/log/nginx/o4o-dev-access.log${NC} - 접근 로그 모니터링"

exit 0