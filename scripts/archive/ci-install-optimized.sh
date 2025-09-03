#!/bin/bash
# 최적화된 CI/CD 설치 스크립트

set -e

echo "🚀 Starting optimized CI installation..."
START_TIME=$(date +%s)

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 환경 준비
prepare_environment() {
  echo -e "${YELLOW}📦 Preparing environment...${NC}"
  
  # 기본 npm 설정 (최소한으로)
  npm config set registry https://registry.npmjs.org/
  npm config set fetch-retries 2
  npm config set fetch-retry-mintimeout 10000
  
  # workspace node_modules 제거 (병렬 처리)
  echo "Cleaning workspace node_modules in parallel..."
  find apps packages -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
}

# 2. 캐시 활용 전략
use_cache_strategy() {
  echo -e "${YELLOW}💾 Setting up cache strategy...${NC}"
  
  # npm 캐시 디렉토리 설정
  export npm_config_cache="/tmp/npm-cache"
  mkdir -p "$npm_config_cache"
  
  # 기존 package-lock.json 활용
  if [ -f "package-lock.json" ]; then
    echo "Using existing package-lock.json"
  else
    echo "No package-lock.json found, will generate"
  fi
}

# 3. 빠른 설치 (CI 모드)
fast_install() {
  echo -e "${YELLOW}⚡ Running fast CI installation...${NC}"
  
  # CI 모드로 설치 (package-lock.json 필수)
  if [ -f "package-lock.json" ]; then
    # npm ci는 package-lock.json을 그대로 사용하므로 빠름
    npm ci --legacy-peer-deps --no-audit --no-fund --silent 2>&1 | \
      grep -E "(added|ERR)" || true
  else
    # package-lock.json이 없으면 생성 후 설치
    echo "Generating package-lock.json..."
    pnpm install --legacy-peer-deps --no-audit --no-fund --package-lock-only
    
    echo "Installing with npm ci..."
    npm ci --legacy-peer-deps --no-audit --no-fund --silent 2>&1 | \
      grep -E "(added|ERR)" || true
  fi
}

# 4. 필수 패키지만 빌드
build_essentials() {
  echo -e "${YELLOW}🔨 Building essential packages...${NC}"
  
  # 타입과 유틸리티 패키지만 먼저 빌드 (병렬 처리)
  (cd packages/types && npm run build 2>/dev/null) &
  (cd packages/utils && npm run build 2>/dev/null) &
  wait
  
  echo "Essential packages built"
}

# 5. 검증
verify_installation() {
  echo -e "${YELLOW}✅ Verifying installation...${NC}"
  
  # 주요 디렉토리 확인
  if [ -d "node_modules" ]; then
    echo "✓ Root node_modules exists"
  else
    echo "✗ Root node_modules missing"
    return 1
  fi
  
  # 패키지 수 확인
  PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
  echo "✓ Installed $PACKAGE_COUNT packages"
}

# 6. 정리
cleanup() {
  echo -e "${YELLOW}🧹 Cleaning up...${NC}"
  
  # workspace node_modules 제거 (CI에서는 불필요)
  find apps packages -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
  
  # 임시 캐시 정리 (선택적)
  # rm -rf /tmp/npm-cache
}

# 메인 실행 (오류 처리 포함)
main() {
  prepare_environment
  use_cache_strategy
  
  # 설치 시도 (실패 시 폴백)
  if ! fast_install; then
    echo -e "${YELLOW}⚠️  Fast install failed, trying fallback...${NC}"
    npm cache clean --force
    pnpm install --legacy-peer-deps --no-audit --no-fund
  fi
  
  build_essentials
  verify_installation
  cleanup
  
  # 실행 시간 계산
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo -e "${GREEN}✅ CI installation completed in ${DURATION} seconds!${NC}"
}

# 트랩 설정 (중단 시 정리)
trap cleanup EXIT

# 실행
main