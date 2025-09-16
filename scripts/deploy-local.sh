#!/bin/bash

# O4O Platform 로컬 배포 스크립트
# 사용법: ./scripts/deploy-local.sh [target] [app]
# target: webserver | apiserver | nginx
# app: admin | api | nginx (선택사항)

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 도움말
show_help() {
    echo "O4O Platform 로컬 배포 스크립트"
    echo ""
    echo "사용법:"
    echo "  $0 webserver admin     # Admin Dashboard를 웹서버에 배포"
    echo "  $0 apiserver           # API 서버에 배포"
    echo "  $0 nginx               # Nginx 설정 배포"
    echo ""
    echo "대상 서버:"
    echo "  webserver   - 웹서버 (13.125.144.8)"
    echo "  apiserver   - API 서버 (43.202.242.215)" 
    echo "  nginx       - Nginx 설정 배포"
    echo ""
    echo "앱 종류 (webserver용):"
    echo "  admin       - Admin Dashboard"
}

# 파라미터 검사
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

TARGET=$1
APP=$2

# 설정
WEB_HOST="13.125.144.8"
API_HOST="43.202.242.215"
WEB_USER="ubuntu"
API_USER="ubuntu"

case $TARGET in
    "webserver")
        if [ -z "$APP" ]; then
            log_error "웹서버 배포시 앱을 지정해야 합니다 (admin)"
            exit 1
        fi
        ./scripts/deploy-webserver.sh $APP
        ;;
    "apiserver")
        ./scripts/deploy-apiserver.sh
        ;;
    "nginx")
        ./scripts/deploy-nginx.sh
        ;;
    *)
        log_error "올바르지 않은 대상: $TARGET"
        show_help
        exit 1
        ;;
esac

log_success "배포 완료!"