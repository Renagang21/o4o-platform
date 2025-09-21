#!/bin/bash
# 통합 배포 스크립트

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 서버 타입 감지
detect_server_type() {
    if [ -n "$SERVER_TYPE" ]; then
        echo "$SERVER_TYPE"
    elif [ -f /.dockerenv ]; then
        echo "docker"
    elif [ "$HOSTNAME" = "o4o-webserver" ]; then
        echo "webserver"
    elif [ "$HOSTNAME" = "o4o-apiserver" ]; then
        echo "apiserver"
    else
        echo "local"
    fi
}

# 사용법
usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  build     - 빌드 실행"
    echo "  start     - PM2로 서비스 시작"
    echo "  stop      - PM2 서비스 중지"
    echo "  restart   - PM2 서비스 재시작"
    echo "  clean     - 캐시 및 빌드 파일 정리"
    echo "  deploy    - 전체 배포 프로세스"
    echo ""
    echo "Options:"
    echo "  --type [webserver|apiserver|local]  - 서버 타입 지정"
    echo ""
    exit 1
}

# 빌드
do_build() {
    local server_type=${1:-$(detect_server_type)}
    
    echo -e "${YELLOW}🔨 Building for $server_type...${NC}"
    
    case $server_type in
        webserver)
            # 웹서버 빌드
            pnpm run build:packages
            pnpm run build:web
            ;;
        apiserver)
            # API 서버 빌드
            pnpm run build:packages
            pnpm run build:api
            ;;
        local|*)
            # 전체 빌드
            pnpm run build
            ;;
    esac
}

# PM2 시작
do_start() {
    local server_type=${1:-$(detect_server_type)}
    
    echo -e "${YELLOW}🚀 Starting $server_type...${NC}"
    
    case $server_type in
        webserver)
            pm2 start ecosystem.config.webserver.cjs
            ;;
        apiserver)
            pm2 start ecosystem.config.apiserver.cjs
            ;;
        local|*)
            pm2 start ecosystem.config.local.cjs
            ;;
    esac
}

# PM2 중지
do_stop() {
    local server_type=${1:-$(detect_server_type)}
    
    echo -e "${YELLOW}⏹️ Stopping $server_type...${NC}"
    
    case $server_type in
        webserver)
            pm2 stop ecosystem.config.webserver.cjs
            ;;
        apiserver)
            pm2 stop ecosystem.config.apiserver.cjs
            ;;
        local|*)
            pm2 stop ecosystem.config.local.cjs
            ;;
    esac
}

# PM2 재시작
do_restart() {
    local server_type=${1:-$(detect_server_type)}
    
    echo -e "${YELLOW}🔄 Restarting $server_type...${NC}"
    
    case $server_type in
        webserver)
            pm2 restart ecosystem.config.webserver.cjs
            ;;
        apiserver)
            pm2 restart ecosystem.config.apiserver.cjs
            ;;
        local|*)
            pm2 restart ecosystem.config.local.cjs
            ;;
    esac
}

# 정리
do_clean() {
    echo -e "${YELLOW}🧹 Cleaning...${NC}"
    
    # 캐시 정리
    rm -rf .vite-cache
    rm -rf apps/*/.vite-cache
    
    # Next.js 캐시 정리
    rm -rf apps/*/.next
    
    # 빌드 파일 정리
    rm -rf apps/*/dist
    rm -rf packages/*/dist
    
    # node_modules 정리 (선택적)
    if [ "$1" = "--full" ]; then
        rm -rf node_modules
        rm -rf apps/*/node_modules
        rm -rf packages/*/node_modules
    fi
}

# 전체 배포
do_deploy() {
    local server_type=${1:-$(detect_server_type)}
    
    echo -e "${GREEN}🚀 Starting deployment for $server_type${NC}"
    
    # 1. 정리
    do_clean
    
    # 2. 의존성 설치
    ./scripts/install.sh ci
    
    # 3. 빌드
    do_build $server_type
    
    # 4. PM2 재시작
    do_stop $server_type
    do_start $server_type
    
    echo -e "${GREEN}✅ Deployment completed!${NC}"
}

# 메인 실행
COMMAND=$1
SERVER_TYPE=""

# 옵션 파싱
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            SERVER_TYPE=$2
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

case $COMMAND in
    build)
        do_build $SERVER_TYPE
        ;;
    start)
        do_start $SERVER_TYPE
        ;;
    stop)
        do_stop $SERVER_TYPE
        ;;
    restart)
        do_restart $SERVER_TYPE
        ;;
    clean)
        do_clean
        ;;
    deploy)
        do_deploy $SERVER_TYPE
        ;;
    *)
        usage
        ;;
esac