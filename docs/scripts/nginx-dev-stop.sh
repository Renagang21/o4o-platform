#!/bin/bash

# O4O Platform - 개발환경 Nginx 중지 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 O4O Platform 개발환경 Nginx 중지...${NC}"

# 프로젝트 루트 및 설정 파일 경로
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_CONFIG_FILE="$PROJECT_ROOT/nginx/local-dev.conf"
NGINX_PID_FILE="/var/run/nginx/nginx-o4o-dev.pid"

# PID 파일 확인
if [ ! -f "$NGINX_PID_FILE" ]; then
    echo -e "${YELLOW}⚠️ PID 파일을 찾을 수 없습니다: $NGINX_PID_FILE${NC}"
    
    # 포트 8080을 사용하는 nginx 프로세스 확인
    if netstat -tuln | grep -q ":8080 "; then
        echo -e "${YELLOW}포트 8080을 사용하는 프로세스가 있습니다.${NC}"
        echo "포트 8080을 사용하는 프로세스:"
        sudo netstat -tulnp | grep ":8080 " || true
        echo ""
        echo -e "${YELLOW}강제로 종료하시겠습니까? (y/N):${NC}"
        read -r answer
        if [[ $answer =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}nginx 프로세스를 강제 종료합니다...${NC}"
            sudo pkill -f "nginx.*o4o" || true
            sudo pkill -f "nginx.*8080" || true
            echo -e "${GREEN}✅ 프로세스 종료 완료${NC}"
        fi
    else
        echo -e "${GREEN}✅ Nginx가 실행되지 않은 상태입니다.${NC}"
    fi
    exit 0
fi

# PID 유효성 확인
PID=$(cat "$NGINX_PID_FILE")
if ! kill -0 "$PID" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ PID $PID에 해당하는 프로세스가 존재하지 않습니다.${NC}"
    echo "PID 파일을 정리합니다..."
    sudo rm -f "$NGINX_PID_FILE"
    echo -e "${GREEN}✅ 정리 완료${NC}"
    exit 0
fi

echo -e "${BLUE}현재 실행 중인 Nginx PID: $PID${NC}"

# Graceful shutdown 시도
echo -e "${BLUE}⏳ Graceful shutdown 시도 중...${NC}"
if sudo nginx -s quit -c "$NGINX_CONFIG_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Graceful shutdown 신호 전송 완료${NC}"
    
    # 종료 대기 (최대 10초)
    echo "프로세스 종료 대기 중..."
    for i in {1..10}; do
        if ! kill -0 "$PID" 2>/dev/null; then
            echo -e "${GREEN}✅ Nginx가 정상적으로 종료되었습니다.${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    
    # 여전히 실행 중인지 확인
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}⚠️ Graceful shutdown 실패. 강제 종료를 시도합니다.${NC}"
        sudo kill -TERM "$PID" 2>/dev/null || true
        sleep 2
        
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${RED}강제 종료 시도...${NC}"
            sudo kill -KILL "$PID" 2>/dev/null || true
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Graceful shutdown 실패. 강제 종료를 시도합니다.${NC}"
    sudo kill -TERM "$PID" 2>/dev/null || true
    sleep 2
    
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${RED}강제 종료 시도...${NC}"
        sudo kill -KILL "$PID" 2>/dev/null || true
    fi
fi

# PID 파일 정리
if [ -f "$NGINX_PID_FILE" ]; then
    sudo rm -f "$NGINX_PID_FILE"
    echo -e "${GREEN}✅ PID 파일 정리 완료${NC}"
fi

# 포트 확인
sleep 1
if netstat -tuln | grep -q ":8080 "; then
    echo -e "${RED}❌ 포트 8080이 여전히 사용 중입니다.${NC}"
    echo "포트를 사용하는 프로세스:"
    sudo netstat -tulnp | grep ":8080 " || true
    
    echo ""
    echo -e "${YELLOW}남은 프로세스를 강제로 종료하시겠습니까? (y/N):${NC}"
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        sudo pkill -f "nginx" || true
        echo -e "${GREEN}✅ 모든 nginx 프로세스 강제 종료 완료${NC}"
    fi
else
    echo -e "${GREEN}✅ 포트 8080이 해제되었습니다.${NC}"
fi

# 최종 상태 확인
echo ""
echo -e "${BLUE}📊 최종 상태:${NC}"
if ! pgrep -f "nginx.*o4o" > /dev/null; then
    echo -e "${GREEN}✅ O4O Nginx 프로세스: 종료됨${NC}"
else
    echo -e "${RED}❌ O4O Nginx 프로세스: 여전히 실행 중${NC}"
fi

if ! netstat -tuln | grep -q ":8080 "; then
    echo -e "${GREEN}✅ 포트 8080: 해제됨${NC}"
else
    echo -e "${RED}❌ 포트 8080: 여전히 사용 중${NC}"
fi

# 개발 서버 상태 안내
echo ""
echo -e "${BLUE}💡 개발 서버 상태:${NC}"
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name (포트 $port) 실행 중${NC}"
    else
        echo -e "${YELLOW}⚪ $service_name (포트 $port) 실행되지 않음${NC}"
    fi
}

check_service "Main Site" 3000
check_service "Admin Dashboard" 3001
check_service "API Server" 4000

echo ""
echo -e "${GREEN}🎉 Nginx 중지 완료!${NC}"
echo ""
echo -e "${BLUE}재시작하려면:${NC}"
echo -e "${GREEN}./scripts/nginx-dev-start.sh${NC}"
echo ""
echo -e "${BLUE}모든 서비스와 함께 시작하려면:${NC}"
echo -e "${GREEN}./scripts/dev-with-nginx.sh${NC}"

exit 0