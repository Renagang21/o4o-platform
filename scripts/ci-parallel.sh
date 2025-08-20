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
    if [ -d "$path" ]; then
        (cd "$path" && npm ci --legacy-peer-deps --no-audit --no-fund --silent 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund --silent) &
        pids+=($!)
    else
        echo -e "${YELLOW}  ⚠️ Skipping $name (directory not found)${NC}"
    fi
}

# 1. 루트 의존성 설치
echo -e "${YELLOW}Phase 1: Root dependencies${NC}"
npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund --silent 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund --silent

# 2. Core packages 병렬 설치
echo -e "${YELLOW}Phase 2: Core packages (parallel)${NC}"
install_package "packages/types" "@o4o/types"
install_package "packages/utils" "@o4o/utils"
install_package "packages/ui" "@o4o/ui"
install_package "packages/auth-client" "@o4o/auth-client"
install_package "packages/auth-context" "@o4o/auth-context"
install_package "packages/block-core" "@o4o/block-core"

# 첫 번째 배치 대기
for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done
pids=()

echo -e "${GREEN}  ✓ Core packages completed${NC}"

# 3. Block packages 병렬 설치 (옵션)
echo -e "${YELLOW}Phase 3: Block packages (optional)${NC}"
# 블록 패키지는 workspace에서 제외되어 있으므로 스킵
echo -e "${GREEN}  ✓ Block packages are managed separately${NC}"

# 4. Apps 병렬 설치 (메모리를 고려해 2개씩 배치)
echo -e "${YELLOW}Phase 4: Apps (parallel batches)${NC}"

# 첫 번째 배치
install_package "apps/api-server" "api-server"
install_package "apps/main-site" "main-site"

for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done
pids=()

# 두 번째 배치
install_package "apps/admin-dashboard" "admin-dashboard"
install_package "apps/ecommerce" "ecommerce"

for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done
pids=()

# 세 번째 배치
install_package "apps/crowdfunding" "crowdfunding"
install_package "apps/digital-signage" "digital-signage"

for pid in "${pids[@]}"; do
    wait $pid 2>/dev/null
done

echo -e "${GREEN}  ✓ Apps completed${NC}"

echo -e "${GREEN}✅ Parallel CI installation completed successfully!${NC}"