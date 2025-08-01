#!/bin/bash
# 통합 개발 도구 스크립트
# Firebase Studio npm "2" 버그 우회 및 주요 개발 명령어 통합

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 사용법 출력
usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  lint          Run ESLint on all source files"
    echo "  lint:fix      Run ESLint with auto-fix"
    echo "  type-check    Run TypeScript type checking"
    echo "  test          Run all tests"
    echo "  build         Build all packages and apps"
    echo "  build:packages Build only packages"
    echo "  start         Start local development servers"
    echo "  stop          Stop local development servers"
    echo ""
    echo "Examples:"
    echo "  $0 lint"
    echo "  $0 build"
    exit 1
}

# Lint 실행
run_lint() {
    echo -e "${GREEN}🔍 Running ESLint...${NC}"
    ./node_modules/.bin/eslint \
        --config ./eslint.config.js \
        apps/*/src/**/*.{ts,tsx} \
        packages/*/src/**/*.{ts,tsx} \
        --report-unused-disable-directives \
        --max-warnings 0 \
        "$@"
}

# TypeScript 체크
run_type_check() {
    echo -e "${GREEN}📘 Running TypeScript checks...${NC}"
    
    # Build packages first
    echo "Building packages..."
    for pkg in types utils ui auth-client auth-context crowdfunding-types forum-types shortcodes; do
        if [ -d "packages/$pkg" ]; then
            echo "  - Building @o4o/$pkg"
            (cd "packages/$pkg" && ../../node_modules/.bin/tsc) || true
        fi
    done
    
    # Type check apps
    echo "Type checking apps..."
    for app in api-server main-site admin-dashboard ecommerce crowdfunding digital-signage; do
        if [ -d "apps/$app" ]; then
            echo "  - Checking $app"
            (cd "apps/$app" && ../../node_modules/.bin/tsc --noEmit) || true
        fi
    done
}

# 테스트 실행
run_tests() {
    echo -e "${GREEN}🧪 Running tests...${NC}"
    
    # Run tests for each workspace
    for dir in apps/* packages/*; do
        if [ -f "$dir/package.json" ] && grep -q "\"test\":" "$dir/package.json"; then
            echo "Testing $(basename $dir)..."
            (cd "$dir" && npm test -- --passWithNoTests) || true
        fi
    done
}

# 빌드 실행
run_build() {
    echo -e "${GREEN}🔨 Building project...${NC}"
    
    # Build packages first
    ./scripts/dev.sh build:packages
    
    # Build apps
    echo "Building apps..."
    for app in api-server main-site admin-dashboard ecommerce crowdfunding digital-signage; do
        if [ -d "apps/$app" ]; then
            echo "  - Building $app"
            (cd "apps/$app" && npm run build) || true
        fi
    done
}

# 패키지만 빌드
build_packages() {
    echo -e "${GREEN}📦 Building packages...${NC}"
    
    # Build in dependency order
    local packages=("types" "utils" "ui" "auth-client" "auth-context" "crowdfunding-types" "forum-types" "shortcodes")
    
    for pkg in "${packages[@]}"; do
        if [ -d "packages/$pkg" ]; then
            echo "  - Building @o4o/$pkg"
            (cd "packages/$pkg" && npm run build) || true
        fi
    done
}

# 개발 서버 시작
start_dev() {
    echo -e "${GREEN}🚀 Starting development servers...${NC}"
    
    # Kill existing processes
    pkill -f "vite" || true
    pkill -f "nodemon" || true
    
    # Start servers
    echo "Starting API server..."
    (cd apps/api-server && npm run dev > /tmp/api-server.log 2>&1 &)
    
    echo "Starting web apps..."
    (cd apps/main-site && npm run dev > /tmp/main-site.log 2>&1 &)
    (cd apps/admin-dashboard && npm run dev > /tmp/admin-dashboard.log 2>&1 &)
    
    echo -e "${GREEN}✅ Development servers started!${NC}"
    echo "  - API Server: http://localhost:4000"
    echo "  - Main Site: http://localhost:3000"
    echo "  - Admin Dashboard: http://localhost:3001"
    echo ""
    echo "Logs available at:"
    echo "  - /tmp/api-server.log"
    echo "  - /tmp/main-site.log"
    echo "  - /tmp/admin-dashboard.log"
}

# 개발 서버 중지
stop_dev() {
    echo -e "${YELLOW}🛑 Stopping development servers...${NC}"
    
    pkill -f "vite" || true
    pkill -f "nodemon" || true
    pkill -f "node.*api-server" || true
    
    echo -e "${GREEN}✅ All servers stopped${NC}"
}

# 메인 로직
case "$1" in
    lint)
        shift
        run_lint "$@"
        ;;
    lint:fix)
        shift
        run_lint --fix "$@"
        ;;
    type-check)
        run_type_check
        ;;
    test)
        run_tests
        ;;
    build)
        run_build
        ;;
    build:packages)
        build_packages
        ;;
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    *)
        usage
        ;;
esac