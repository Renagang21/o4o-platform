#!/bin/bash

# O4O Platform - 모든 개발 서비스 중지 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🛑 O4O Platform 모든 개발 서비스 중지${NC}"
echo -e "${BLUE}======================================${NC}"

# 프로젝트 루트 확인
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}프로젝트 루트: $PROJECT_ROOT${NC}"

# 중지할 서비스들과 포트
SERVICES=(
    "nginx:8080"
    "main-site:3000"
    "admin-dashboard:3001"
    "api-server:4000"
)

# Nginx 중지
echo ""
echo -e "${CYAN}🌐 Nginx 중지 중...${NC}"
if ./scripts/nginx-dev-stop.sh 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx 중지 완료${NC}"
else
    echo -e "${YELLOW}⚠️ Nginx 중지 과정에서 오류가 있었습니다 (이미 중지되었을 수 있음)${NC}"
fi

# 개발 서버 PID 기반 중지
echo ""
echo -e "${CYAN}🔧 개발 서버 중지 중...${NC}"

stop_dev_service() {
    local service_name=$1
    local pid_file="/tmp/o4o-$service_name.pid"
    local log_file="/tmp/o4o-$service_name.log"
    
    echo -e "${BLUE}  $service_name 중지 중...${NC}"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}    PID $pid 종료 시도 중...${NC}"
            
            # Graceful shutdown 시도
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            
            # 여전히 실행 중인지 확인
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}    강제 종료 시도 중...${NC}"
                kill -KILL "$pid" 2>/dev/null || true
                sleep 1
            fi
            
            # 최종 확인
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}    ❌ 종료 실패 (PID: $pid)${NC}"
            else
                echo -e "${GREEN}    ✅ 정상 종료됨${NC}"
            fi
        else
            echo -e "${YELLOW}    ⚠️ 프로세스가 이미 종료됨 (PID: $pid)${NC}"
        fi
        
        # PID 파일 정리
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}    ⚠️ PID 파일 없음${NC}"
    fi
    
    # 로그 파일 보관 (선택적)
    if [ -f "$log_file" ]; then
        local backup_log="/tmp/o4o-$service_name-$(date +%Y%m%d-%H%M%S).log"
        mv "$log_file" "$backup_log" 2>/dev/null || true
        echo -e "${BLUE}    로그 백업: $backup_log${NC}"
    fi
}

# 각 개발 서비스 중지
stop_dev_service "api-server"
stop_dev_service "main-site"
stop_dev_service "admin-dashboard"

# 포트별 프로세스 강제 종료 (추가 안전장치)
echo ""
echo -e "${CYAN}🔍 포트별 프로세스 확인 및 정리...${NC}"

cleanup_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${BLUE}  포트 $port ($service_name) 확인 중...${NC}"
    
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${YELLOW}    포트 $port가 여전히 사용 중입니다.${NC}"
        
        # 포트를 사용하는 프로세스 찾기
        local pids=$(sudo netstat -tulnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | sort -u | grep -E '^[0-9]+$' || true)
        
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}    관련 프로세스: $pids${NC}"
            echo -e "${YELLOW}    강제 종료하시겠습니까? (y/N):${NC}"
            read -r answer
            if [[ $answer =~ ^[Yy]$ ]]; then
                for pid in $pids; do
                    if kill -0 "$pid" 2>/dev/null; then
                        echo -e "${BLUE}      PID $pid 종료 중...${NC}"
                        sudo kill -TERM "$pid" 2>/dev/null || true
                        sleep 1
                        if kill -0 "$pid" 2>/dev/null; then
                            sudo kill -KILL "$pid" 2>/dev/null || true
                        fi
                    fi
                done
                echo -e "${GREEN}    ✅ 프로세스 정리 완료${NC}"
            fi
        fi
    else
        echo -e "${GREEN}    ✅ 포트 $port 해제됨${NC}"
    fi
}

cleanup_port 8080 "Nginx Gateway"
cleanup_port 3000 "Main Site"
cleanup_port 3001 "Admin Dashboard"
cleanup_port 4000 "API Server"

# Node.js 프로세스 정리 (추가 옵션)
echo ""
echo -e "${CYAN}🧹 추가 정리 옵션...${NC}"

# 관련 Node.js 프로세스 확인
NODE_PROCESSES=$(pgrep -f "node.*vite\|node.*server\|npm.*dev" 2>/dev/null || true)

if [ -n "$NODE_PROCESSES" ]; then
    echo -e "${YELLOW}관련 Node.js 프로세스가 여전히 실행 중입니다:${NC}"
    echo "$NODE_PROCESSES" | while read -r pid; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            local cmd=$(ps -p "$pid" -o cmd --no-headers 2>/dev/null || echo "알 수 없음")
            echo -e "${BLUE}  PID $pid: $cmd${NC}"
        fi
    done
    
    echo -e "${YELLOW}이 프로세스들도 종료하시겠습니까? (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        echo "$NODE_PROCESSES" | while read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo -e "${BLUE}  PID $pid 종료 중...${NC}"
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done
        sleep 2
        echo -e "${GREEN}✅ Node.js 프로세스 정리 완료${NC}"
    fi
fi

# 최종 상태 확인
echo ""
echo -e "${PURPLE}📊 최종 상태 확인${NC}"
echo -e "${BLUE}==================${NC}"

# 포트 사용 상태 최종 확인
echo -e "${CYAN}포트 상태:${NC}"
for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${RED}❌ 포트 $port ($service_name): 여전히 사용 중${NC}"
    else
        echo -e "${GREEN}✅ 포트 $port ($service_name): 해제됨${NC}"
    fi
done

# PID 파일 정리 상태
echo ""
echo -e "${CYAN}PID 파일 정리 상태:${NC}"
for service in "api-server" "main-site" "admin-dashboard"; do
    if [ -f "/tmp/o4o-$service.pid" ]; then
        echo -e "${RED}❌ /tmp/o4o-$service.pid: 여전히 존재${NC}"
    else
        echo -e "${GREEN}✅ /tmp/o4o-$service.pid: 정리됨${NC}"
    fi
done

# Nginx PID 파일 확인
if [ -f "/var/run/nginx/nginx-o4o-dev.pid" ]; then
    echo -e "${RED}❌ Nginx PID 파일: 여전히 존재${NC}"
else
    echo -e "${GREEN}✅ Nginx PID 파일: 정리됨${NC}"
fi

# 임시 로그 파일 정리 옵션
echo ""
echo -e "${CYAN}🗂️ 임시 파일 정리:${NC}"

TEMP_LOG_FILES=$(ls /tmp/o4o-*.log 2>/dev/null || true)
if [ -n "$TEMP_LOG_FILES" ]; then
    echo -e "${YELLOW}임시 로그 파일들이 남아있습니다:${NC}"
    echo "$TEMP_LOG_FILES"
    echo ""
    echo -e "${YELLOW}이 파일들을 삭제하시겠습니까? (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        rm -f /tmp/o4o-*.log
        echo -e "${GREEN}✅ 임시 로그 파일 삭제 완료${NC}"
    else
        echo -e "${BLUE}로그 파일은 보관됩니다.${NC}"
    fi
fi

# 완료 메시지
echo ""
echo -e "${GREEN}🎉 모든 개발 서비스 중지 완료!${NC}"

echo ""
echo -e "${BLUE}💡 다시 시작하려면:${NC}"
echo -e "${GREEN}./scripts/dev-with-nginx.sh${NC}     # 모든 서비스 + Nginx 통합 시작"
echo -e "${GREEN}npm run dev:all${NC}                # 개발 서버만 시작"
echo -e "${GREEN}./scripts/nginx-dev-start.sh${NC}   # Nginx만 시작"

echo ""
echo -e "${BLUE}📋 개별 서비스 시작:${NC}"
echo -e "${GREEN}npm run dev:api${NC}                # API Server (포트 4000)"
echo -e "${GREEN}npm run dev:web${NC}                # Main Site (포트 3000)"
echo -e "${GREEN}npm run dev:admin${NC}              # Admin Dashboard (포트 3001)"

# 시스템 정리 권장사항
echo ""
echo -e "${BLUE}🧹 시스템 정리 권장사항:${NC}"
echo "• 개발 완료 후 정기적으로 이 스크립트를 실행하세요"
echo "• 포트 충돌 시 이 스크립트로 모든 서비스를 정리할 수 있습니다"
echo "• 로그 파일이 너무 크면 /tmp/o4o-*.log 파일들을 정리하세요"

echo ""
echo -e "${PURPLE}👋 O4O Platform 개발환경 정리 완료!${NC}"

exit 0