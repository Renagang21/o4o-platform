#!/bin/bash
# 병렬 CI 설치 스크립트 - 더 빠른 설치를 위해

set -e

echo "🚀 Starting parallel CI installation..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로세스 배열
declare -a pids=()

# 백그라운드 작업 함수
install_package() {
    local path=$1
    local name=$2
    echo -e "${BLUE}  ⏳ Starting: $name${NC}"
    (cd "$path" && npm ci --legacy-peer-deps --no-audit --no-fund --silent 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund --silent) &
    pids+=($!)
}

# 1. 루트 의존성 설치
echo -e "${YELLOW}Phase 1: Root dependencies${NC}"
npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund --silent 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund --silent

# 2. Core packages 병렬 설치
echo -e "${YELLOW}Phase 2: Core packages (parallel)${NC}"
[ -d "packages/types" ] && install_package "packages/types" "@o4o/types"
[ -d "packages/utils" ] && install_package "packages/utils" "@o4o/utils"
[ -d "packages/ui" ] && install_package "packages/ui" "@o4o/ui"
[ -d "packages/auth-client" ] && install_package "packages/auth-client" "@o4o/auth-client"
[ -d "packages/auth-context" ] && install_package "packages/auth-context" "@o4o/auth-context"
[ -d "packages/block-core" ] && install_package "packages/block-core" "@o4o/block-core"

# 첫 번째 배치 대기
for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done
pids=()

echo -e "${GREEN}  ✓ Core packages completed${NC}"

# 3. Block packages 병렬 설치
echo -e "${YELLOW}Phase 3: Block packages (parallel)${NC}"
[ -d "packages/blocks/text-content" ] && install_package "packages/blocks/text-content" "@o4o/text-content-blocks"
[ -d "packages/blocks/layout-media" ] && install_package "packages/blocks/layout-media" "@o4o/layout-media-blocks"
[ -d "packages/blocks/interactive" ] && install_package "packages/blocks/interactive" "@o4o/interactive-blocks"
[ -d "packages/blocks/dynamic" ] && install_package "packages/blocks/dynamic" "@o4o/dynamic-blocks"

# 두 번째 배치 대기
for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done
pids=()

echo -e "${GREEN}  ✓ Block packages completed${NC}"

# 4. Apps 병렬 설치 (메모리를 고려해 2개씩 배치)
echo -e "${YELLOW}Phase 4: Apps (parallel batches)${NC}"

# 첫 번째 배치
[ -d "apps/api-server" ] && install_package "apps/api-server" "api-server"
[ -d "apps/main-site" ] && install_package "apps/main-site" "main-site"

for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done
pids=()

# 두 번째 배치
[ -d "apps/admin-dashboard" ] && install_package "apps/admin-dashboard" "admin-dashboard"
[ -d "apps/ecommerce" ] && install_package "apps/ecommerce" "ecommerce"

for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done
pids=()

# 세 번째 배치
[ -d "apps/crowdfunding" ] && install_package "apps/crowdfunding" "crowdfunding"
[ -d "apps/digital-signage" ] && install_package "apps/digital-signage" "digital-signage"

for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done

echo -e "${GREEN}  ✓ Apps completed${NC}"

echo -e "${GREEN}✅ Parallel CI installation completed successfully!${NC}"