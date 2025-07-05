#!/bin/bash

# O4O Platform - 개발환경 Nginx 설정 스크립트
# WSL Ubuntu 환경 최적화

set -e

echo "🚀 O4O Platform 개발환경 Nginx 설정 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리 확인
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_CONFIG_DIR="$PROJECT_ROOT/nginx"
NGINX_CONFIG_FILE="$NGINX_CONFIG_DIR/local-dev.conf"

echo -e "${BLUE}프로젝트 루트: $PROJECT_ROOT${NC}"

# Nginx 설치 확인 및 설치
echo "📦 Nginx 설치 상태 확인 중..."
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx가 설치되지 않았습니다. 설치를 진행합니다...${NC}"
    
    # Ubuntu/Debian 계열 확인
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y nginx
    else
        echo -e "${RED}❌ 지원되지 않는 패키지 매니저입니다. 수동으로 Nginx를 설치해주세요.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Nginx 설치 완료${NC}"
else
    echo -e "${GREEN}✅ Nginx가 이미 설치되어 있습니다.${NC}"
fi

# Nginx 버전 확인
NGINX_VERSION=$(nginx -v 2>&1 | grep -oP '(?<=nginx/)[0-9.]+')
echo -e "${BLUE}Nginx 버전: $NGINX_VERSION${NC}"

# 설정 파일 존재 확인
if [ ! -f "$NGINX_CONFIG_FILE" ]; then
    echo -e "${RED}❌ Nginx 설정 파일을 찾을 수 없습니다: $NGINX_CONFIG_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Nginx 설정 파일 확인됨${NC}"

# 로그 디렉토리 생성
echo "📁 로그 디렉토리 생성 중..."
sudo mkdir -p /var/log/nginx
sudo chmod 755 /var/log/nginx

# PID 디렉토리 생성
sudo mkdir -p /var/run/nginx
sudo chmod 755 /var/run/nginx

# 설정 파일 문법 검사
echo "🔍 Nginx 설정 파일 문법 검사 중..."
if sudo nginx -t -c "$NGINX_CONFIG_FILE"; then
    echo -e "${GREEN}✅ 설정 파일 문법 검사 통과${NC}"
else
    echo -e "${RED}❌ 설정 파일에 문법 오류가 있습니다.${NC}"
    exit 1
fi

# 포트 충돌 검사
echo "🔍 포트 사용 상태 확인 중..."
PORTS_TO_CHECK=(8080 3000 3001 4000)

for port in "${PORTS_TO_CHECK[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        if [ "$port" = "8080" ]; then
            echo -e "${YELLOW}⚠️ 포트 $port가 이미 사용 중입니다. 기존 Nginx 프로세스를 종료합니다.${NC}"
            sudo pkill -f "nginx.*o4o-dev" || true
            sleep 2
        else
            echo -e "${BLUE}ℹ️ 포트 $port 사용 중 (개발 서버가 실행 중인 것으로 추정)${NC}"
        fi
    else
        echo -e "${GREEN}✅ 포트 $port 사용 가능${NC}"
    fi
done

# 설정 파일을 sites-available에 복사 (선택사항)
SITES_AVAILABLE="/etc/nginx/sites-available"
if [ -d "$SITES_AVAILABLE" ]; then
    echo "📋 설정 파일을 sites-available에 복사 중..."
    sudo cp "$NGINX_CONFIG_FILE" "$SITES_AVAILABLE/o4o-local-dev"
    echo -e "${GREEN}✅ 설정 파일 복사 완료${NC}"
fi

# 방화벽 설정 확인 (Ubuntu UFW)
if command -v ufw &> /dev/null; then
    echo "🔥 방화벽 설정 확인 중..."
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "${YELLOW}방화벽이 활성화되어 있습니다. 포트 8080을 허용하시겠습니까? (y/N)${NC}"
        read -r answer
        if [[ $answer =~ ^[Yy]$ ]]; then
            sudo ufw allow 8080/tcp
            echo -e "${GREEN}✅ 포트 8080 방화벽 허용 완료${NC}"
        fi
    fi
fi

# Windows 호스트 파일 설정 안내 (WSL 환경)
if grep -q microsoft /proc/version; then
    echo ""
    echo -e "${YELLOW}📝 WSL 환경 설정 안내:${NC}"
    echo "Windows 호스트 파일에 다음 항목을 추가하면 도메인으로 접근할 수 있습니다:"
    echo ""
    echo -e "${BLUE}C:\\Windows\\System32\\drivers\\etc\\hosts 파일에 추가:${NC}"
    echo "127.0.0.1    local-dev.neture.co.kr"
    echo ""
    echo -e "${YELLOW}관리자 권한으로 메모장을 실행하여 hosts 파일을 편집하세요.${NC}"
    echo ""
fi

# 개발 서버 실행 상태 확인
echo "🔍 개발 서버 실행 상태 확인 중..."
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s "http://localhost:$port" > /dev/null; then
        echo -e "${GREEN}✅ $service_name (포트 $port) 실행 중${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name (포트 $port) 실행되지 않음${NC}"
        return 1
    fi
}

echo ""
echo "📊 서비스 상태:"
check_service "Main Site" 3000 || echo -e "${YELLOW}   → 실행 명령: npm run dev:web${NC}"
check_service "Admin Dashboard" 3001 || echo -e "${YELLOW}   → 실행 명령: npm run dev:admin${NC}"
check_service "API Server" 4000 || echo -e "${YELLOW}   → 실행 명령: npm run dev:api${NC}"

echo ""
echo -e "${GREEN}🎉 Nginx 개발환경 설정 완료!${NC}"
echo ""
echo -e "${BLUE}다음 단계:${NC}"
echo "1. 개발 서버들을 실행하세요:"
echo "   npm run dev:all"
echo ""
echo "2. Nginx를 시작하세요:"
echo "   ./scripts/nginx-dev-start.sh"
echo ""
echo "3. 브라우저에서 접근하세요:"
echo -e "${GREEN}   http://localhost:8080          ${NC}→ 메인 사이트"
echo -e "${GREEN}   http://localhost:8080/admin    ${NC}→ 관리자 대시보드"
echo -e "${GREEN}   http://localhost:8080/api      ${NC}→ API 서버"
echo -e "${GREEN}   http://localhost:8080/dev-info ${NC}→ 개발 정보"
echo ""

# 추가 유틸리티 명령어 안내
echo -e "${BLUE}유용한 명령어:${NC}"
echo "  ./scripts/nginx-dev-start.sh     - Nginx 시작"
echo "  ./scripts/nginx-dev-stop.sh      - Nginx 중지"
echo "  ./scripts/nginx-dev-reload.sh    - Nginx 재로드"
echo "  ./scripts/dev-with-nginx.sh      - 모든 서비스 + Nginx 시작"
echo ""

exit 0