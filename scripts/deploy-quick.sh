#!/bin/bash

# O4O Platform Quick Deploy Script
# 개발 중 빠른 배포를 위한 스크립트 (테스트 및 빌드 최소화)

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_usage() {
    cat << EOF
O4O Platform 빠른 배포 스크립트

사용법: $0 [target]

배포 대상:
  api      API 서버만 빠른 배포
  web      웹 서버만 빠른 배포
  all      전체 빠른 배포 (기본값)

특징:
  - 배포 전 테스트 건너뜀
  - 확인 프롬프트 없음
  - 최소한의 빌드만 수행

EOF
}

main() {
    local target=${1:-all}
    
    case $target in
        --help|-h)
            print_usage
            exit 0
            ;;
        api|web|all)
            # 정상 처리
            ;;
        *)
            echo -e "${YELLOW}⚠️  알 수 없는 대상: $target${NC}"
            print_usage
            exit 1
            ;;
    esac
    
    echo -e "${BLUE}🚀 빠른 배포 시작 (대상: $target)${NC}"
    echo -e "${YELLOW}⚠️  테스트 및 확인 과정을 건너뜁니다${NC}"
    echo ""
    
    # 메인 배포 스크립트 호출 (테스트 및 확인 스킵)
    "$SCRIPT_DIR/deploy-main.sh" "$target" --skip-tests --force
    
    echo ""
    echo -e "${GREEN}✅ 빠른 배포 완료!${NC}"
}

main "$@"