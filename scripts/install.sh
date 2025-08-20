#!/bin/bash
# 통합 설치 스크립트 - 모든 설치 옵션을 하나로

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 사용법
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  quick     - 빠른 설치 (최소 옵션)"
    echo "  split     - 순차적 분할 설치"
    echo "  parallel  - 병렬 분할 설치 (기본값)"
    echo "  blocks    - 블록 패키지만 설치"
    echo "  ci        - CI/CD용 설치"
    echo ""
    exit 1
}

# 빠른 설치
install_quick() {
    echo -e "${YELLOW}🚀 Quick installation...${NC}"
    npm ci --legacy-peer-deps --no-audit --no-fund --ignore-scripts --loglevel=error 2>/dev/null || \
    npm install --legacy-peer-deps --no-audit --no-fund --ignore-scripts --loglevel=error
}

# 순차 설치
install_split() {
    echo -e "${YELLOW}📦 Split installation...${NC}"
    
    # 1. 루트
    echo "Step 1: Root dependencies..."
    npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund 2>/dev/null || \
    npm install --legacy-peer-deps --no-audit --no-fund
    
    # 2. Core packages
    echo "Step 2: Core packages..."
    for pkg in types utils ui auth-client auth-context block-core; do
        if [ -d "packages/$pkg" ]; then
            echo "  Installing @o4o/$pkg..."
            (cd "packages/$pkg" && npm ci --legacy-peer-deps --no-audit --no-fund 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund)
        fi
    done
    
    # 3. Apps
    echo "Step 3: Applications..."
    for app in api-server main-site admin-dashboard; do
        if [ -d "apps/$app" ]; then
            echo "  Installing $app..."
            (cd "apps/$app" && npm ci --legacy-peer-deps --no-audit --no-fund 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund)
        fi
    done
}

# 병렬 설치
install_parallel() {
    echo -e "${YELLOW}⚡ Parallel installation...${NC}"
    
    # 백그라운드 프로세스 배열
    declare -a pids=()
    
    # 1. 루트 설치
    echo "Phase 1: Root dependencies..."
    npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund --silent 2>/dev/null || \
    npm install --legacy-peer-deps --no-audit --no-fund --silent
    
    # 2. 패키지 병렬 설치
    echo "Phase 2: Packages (parallel)..."
    for pkg in types utils ui auth-client auth-context block-core; do
        if [ -d "packages/$pkg" ]; then
            (cd "packages/$pkg" && npm ci --legacy-peer-deps --no-audit --no-fund --silent 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund --silent) &
            pids+=($!)
        fi
    done
    
    # 대기
    for pid in "${pids[@]}"; do
        wait $pid 2>/dev/null
    done
    
    # 3. 앱 병렬 설치 (2개씩)
    echo "Phase 3: Applications (parallel)..."
    pids=()
    
    for app in api-server main-site; do
        if [ -d "apps/$app" ]; then
            (cd "apps/$app" && npm ci --legacy-peer-deps --no-audit --no-fund --silent 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund --silent) &
            pids+=($!)
        fi
    done
    
    for pid in "${pids[@]}"; do
        wait $pid 2>/dev/null
    done
    
    if [ -d "apps/admin-dashboard" ]; then
        (cd "apps/admin-dashboard" && npm ci --legacy-peer-deps --no-audit --no-fund --silent 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund --silent)
    fi
}

# 블록 패키지 설치
install_blocks() {
    echo -e "${YELLOW}🧩 Installing block packages...${NC}"
    
    if [ -d "packages/block-core" ]; then
        echo "Installing block-core..."
        cd packages/block-core
        npm install --legacy-peer-deps --no-audit --no-fund
        npm run build
        cd ../..
    fi
    
    for pkg in text-content layout-media interactive dynamic; do
        if [ -d "packages/blocks/$pkg" ]; then
            echo "Installing $pkg-blocks..."
            cd "packages/blocks/$pkg"
            npm install --legacy-peer-deps --no-audit --no-fund
            npm run build
            cd ../../..
        fi
    done
}

# CI 설치
install_ci() {
    echo -e "${YELLOW}🔧 CI installation...${NC}"
    
    # GitHub Actions 환경 체크
    if [ "$CI" = "true" ]; then
        echo "Detected CI environment"
        install_parallel
    else
        install_quick
    fi
}

# 메인 실행
COMMAND=${1:-parallel}

case $COMMAND in
    quick)
        install_quick
        ;;
    split)
        install_split
        ;;
    parallel)
        install_parallel
        ;;
    blocks)
        install_blocks
        ;;
    ci)
        install_ci
        ;;
    *)
        usage
        ;;
esac

echo -e "${GREEN}✅ Installation completed!${NC}"