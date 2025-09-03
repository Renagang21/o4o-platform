#!/bin/bash
# pnpm 기반 CI/CD 설치 스크립트

set -e

echo "🚀 pnpm CI 설치 시작..."
START_TIME=$(date +%s)

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. pnpm 설치 확인 및 설치
install_pnpm() {
    echo -e "${YELLOW}📦 pnpm 설치 확인...${NC}"
    
    if ! command -v pnpm &> /dev/null; then
        echo "pnpm이 없습니다. 설치 중..."
        pnpm install -g pnpm@latest
    else
        echo "pnpm $(pnpm --version) 발견"
    fi
    
    # pnpm 경로 설정
    export PNPM_HOME="${HOME}/.pnpm"
    export PATH="${PNPM_HOME}:${PATH}"
}

# 2. 환경 정리
clean_environment() {
    echo -e "${YELLOW}🧹 환경 정리...${NC}"
    
    # workspace node_modules 제거 (병렬)
    find apps packages -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    
    # 손상된 lock 파일 감지
    if [ -f "pnpm-lock.yaml" ]; then
        if ! pnpm lockfile verify 2>/dev/null; then
            echo "⚠️  Lock 파일이 손상되었습니다. 재생성합니다..."
            rm -f pnpm-lock.yaml
        fi
    fi
}

# 3. pnpm 설치 실행
run_pnpm_install() {
    echo -e "${YELLOW}⚡ pnpm 설치 실행...${NC}"
    
    # CI 환경 감지
    if [ "$CI" = "true" ]; then
        echo "CI 환경 감지 - frozen-lockfile 모드"
        
        if [ -f "pnpm-lock.yaml" ]; then
            # frozen-lockfile: lock 파일 변경 없이 정확히 설치
            pnpm install --frozen-lockfile --prefer-offline
        else
            # lock 파일이 없으면 생성
            echo "Lock 파일 생성 중..."
            pnpm install --lockfile-only
            pnpm install --frozen-lockfile
        fi
    else
        # 로컬 환경
        pnpm install --prefer-offline
    fi
}

# 4. 선택적 설치 (옵션)
selective_install() {
    local filter=$1
    echo -e "${YELLOW}🎯 선택적 설치: ${filter}${NC}"
    
    case $filter in
        "admin")
            pnpm install --filter @o4o/admin-dashboard...
            ;;
        "api")
            pnpm install --filter @o4o/api-server...
            ;;
        "web")
            pnpm install --filter @o4o/main-site...
            ;;
        "packages")
            pnpm install --filter "./packages/*"
            ;;
        *)
            echo -e "${RED}알 수 없는 필터: ${filter}${NC}"
            exit 1
            ;;
    esac
}

# 5. 필수 패키지 빌드
build_essentials() {
    echo -e "${YELLOW}🔨 필수 패키지 빌드...${NC}"
    
    # 의존성 순서대로 빌드
    pnpm --filter @o4o/types build
    pnpm --filter @o4o/utils build
    
    # 나머지 패키지 병렬 빌드
    pnpm run --parallel --filter "./packages/*" build
}

# 6. 설치 검증
verify_installation() {
    echo -e "${YELLOW}✅ 설치 검증...${NC}"
    
    # pnpm store 상태 확인
    pnpm store status
    
    # 설치된 패키지 수
    PACKAGE_COUNT=$(pnpm list --depth=0 --json | jq '. | length' 2>/dev/null || echo "N/A")
    echo "설치된 패키지: ${PACKAGE_COUNT}개"
    
    # 디스크 사용량
    if [ -d "node_modules" ]; then
        SIZE=$(du -sh node_modules | cut -f1)
        echo "node_modules 크기: ${SIZE}"
    fi
}

# 7. 캐시 전략
setup_cache() {
    echo -e "${YELLOW}💾 캐시 설정...${NC}"
    
    # GitHub Actions 캐시 키 생성
    if [ "$GITHUB_ACTIONS" = "true" ]; then
        CACHE_KEY="pnpm-$(uname -s)-$(uname -m)-$(sha256sum pnpm-lock.yaml | cut -d' ' -f1)"
        echo "cache-key=${CACHE_KEY}" >> $GITHUB_OUTPUT
    fi
    
    # pnpm 캐시 디렉토리 설정
    pnpm config set store-dir ~/.pnpm-store
}

# 8. 성능 리포트
performance_report() {
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   pnpm CI 설치 완료!               ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║   소요 시간: ${DURATION}초         ║${NC}"
    echo -e "${GREEN}║   패키지 매니저: pnpm              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
    echo ""
}

# 메인 실행 로직
main() {
    # 인자 파싱
    FILTER=""
    SKIP_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --filter)
                FILTER="$2"
                shift 2
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # 실행
    install_pnpm
    clean_environment
    setup_cache
    
    if [ -n "$FILTER" ]; then
        selective_install "$FILTER"
    else
        run_pnpm_install
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_essentials
    fi
    
    verify_installation
    performance_report
}

# 에러 핸들링
trap 'echo -e "${RED}❌ 설치 실패${NC}"; exit 1' ERR

# 실행
main "$@"