#!/bin/bash
# 통합 설치 스크립트 - pnpm 버전

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# pnpm 설치 확인
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}📦 Installing pnpm...${NC}"
        npm install -g pnpm@latest
    fi
    echo -e "${GREEN}✓ Using pnpm $(pnpm --version)${NC}"
}

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
    echo -e "${YELLOW}🚀 Quick installation with pnpm...${NC}"
    check_pnpm
    pnpm install --prefer-offline --ignore-scripts
}

# 순차 설치
install_split() {
    echo -e "${YELLOW}📦 Split installation with pnpm...${NC}"
    check_pnpm
    
    # 1. 전체 설치 (pnpm은 workspace를 자동 처리)
    echo "Installing all dependencies..."
    pnpm install --prefer-offline
    
    # 2. Core packages 빌드
    echo "Building core packages..."
    pnpm run build:packages
}

# 병렬 설치
install_parallel() {
    echo -e "${YELLOW}⚡ Parallel installation with pnpm...${NC}"
    check_pnpm
    
    # pnpm은 기본적으로 병렬 설치
    pnpm install --prefer-offline
    
    # 병렬 빌드
    echo "Building packages in parallel..."
    pnpm run --parallel --filter "./packages/*" build
}

# 블록 패키지 설치
install_blocks() {
    echo -e "${YELLOW}🔲 Installing block packages with pnpm...${NC}"
    check_pnpm
    
    # 블록 관련 패키지만 설치
    pnpm install --filter "./packages/block*" --filter "./packages/blocks/*"
    
    # 블록 빌드
    if [ -f "package.json" ] && grep -q "build:blocks" package.json; then
        pnpm run build:blocks
    fi
}

# CI 설치
install_ci() {
    echo -e "${YELLOW}🔄 CI installation with pnpm...${NC}"
    check_pnpm
    
    # CI 환경에서는 frozen-lockfile 사용
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install --frozen-lockfile --prefer-offline
    else
        echo -e "${RED}Warning: pnpm-lock.yaml not found, using regular install${NC}"
        pnpm install --prefer-offline
    fi
}

# 메인 실행
main() {
    COMMAND=${1:-parallel}
    
    case "$COMMAND" in
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
    
    echo -e "${GREEN}✅ Installation completed successfully!${NC}"
}

# 실행
main "$@"