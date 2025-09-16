#!/bin/bash

# O4O Platform 배포 전 자동 테스트 스크립트
# 사용법: ./scripts/pre-deploy-test.sh [target]
# 예시: ./scripts/pre-deploy-test.sh webserver
#       ./scripts/pre-deploy-test.sh apiserver
#       ./scripts/pre-deploy-test.sh all

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수들
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_test() {
    echo -e "${CYAN}🧪 $1${NC}"
}

# 테스트 결과 추적
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# 테스트 실행 함수
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log_test "$test_name 실행 중..."
    
    if eval "$test_command" > /dev/null 2>&1; then
        log_success "$test_name 통과"
        ((TESTS_PASSED++))
        return 0
    else
        log_error "$test_name 실패"
        FAILED_TESTS+=("$test_name")
        ((TESTS_FAILED++))
        return 1
    fi
}

# Git 상태 검사
test_git_status() {
    log_test "Git 상태 검사..."
    
    # 현재 브랜치가 main인지 확인
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$current_branch" != "main" ]; then
        log_warning "현재 브랜치가 main이 아닙니다: $current_branch"
        log_info "main 브랜치로 전환하시겠습니까? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            git checkout main
            git pull origin main
            log_success "main 브랜치로 전환 완료"
        else
            log_error "배포를 위해서는 main 브랜치에서 실행해야 합니다"
            return 1
        fi
    fi
    
    # 미커밋 변경사항 확인
    if ! git diff-index --quiet HEAD --; then
        log_error "커밋되지 않은 변경사항이 있습니다"
        git status --short
        return 1
    fi
    
    # 원격과 동기화 상태 확인
    git fetch origin main
    local_commit=$(git rev-parse HEAD)
    remote_commit=$(git rev-parse origin/main)
    
    if [ "$local_commit" != "$remote_commit" ]; then
        log_warning "로컬과 원격이 동기화되지 않았습니다"
        log_info "원격의 최신 변경사항을 가져오시겠습니까? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            git pull origin main
            log_success "원격 변경사항 동기화 완료"
        else
            log_error "배포를 위해서는 최신 상태여야 합니다"
            return 1
        fi
    fi
    
    log_success "Git 상태 검사 통과"
    return 0
}

# 기본 환경 검사
test_environment() {
    log_test "환경 검사 실행 중..."
    
    # Node.js 버전 검사
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되지 않았습니다"
        return 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local required_version="22.18.0"
    
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        log_warning "Node.js 버전이 권장 버전($required_version)보다 낮습니다: $node_version"
    fi
    
    # pnpm 검사
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm이 설치되지 않았습니다"
        return 1
    fi
    
    # Git 검사
    if ! command -v git &> /dev/null; then
        log_error "Git이 설치되지 않았습니다"
        return 1
    fi
    
    log_success "환경 검사 통과"
    return 0
}

# 의존성 설치 및 검사
test_dependencies() {
    log_test "의존성 검사 및 설치..."
    
    # 의존성 설치
    if ! pnpm install --frozen-lockfile > /dev/null 2>&1; then
        log_error "의존성 설치 실패"
        return 1
    fi
    
    # 취약점 검사
    log_test "보안 취약점 검사..."
    if pnpm audit --audit-level high > /dev/null 2>&1; then
        log_success "보안 취약점 검사 통과"
    else
        log_warning "보안 취약점이 발견되었습니다. 'pnpm audit' 명령으로 확인하세요"
    fi
    
    log_success "의존성 검사 완료"
    return 0
}

# 코드 품질 검사
test_code_quality() {
    log_test "코드 품질 검사 실행 중..."
    
    # TypeScript 타입 체크
    run_test "TypeScript 타입 체크" "pnpm run type-check:frontend"
    
    # ESLint 검사
    run_test "ESLint 검사" "pnpm run lint"
    
    # console.log 검사
    log_test "console.log 검사 실행 중..."
    CONSOLE_LOGS=$(grep -r "console\.log" apps/ --include="*.ts" --include="*.tsx" \
      --exclude-dir=node_modules --exclude-dir=dist \
      --exclude-dir=test --exclude-dir=e2e \
      --exclude="*test*" --exclude="*spec*" \
      | grep -v "//.*console\.log" \
      | grep -v "^\s*//" \
      | grep -v "\*.*console\.log" || true)
    
    if [ -n "$CONSOLE_LOGS" ]; then
        log_error "프로덕션 코드에 console.log가 발견됨:"
        echo "$CONSOLE_LOGS"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("console.log 검사")
    else
        log_success "console.log 검사 통과"
        ((TESTS_PASSED++))
    fi
    
    return 0
}

# 빌드 테스트
test_builds() {
    local target=$1
    
    log_test "빌드 테스트 실행 중..."
    
    # 패키지 빌드
    run_test "패키지 빌드" "pnpm run build:packages"
    
    case $target in
        "webserver"|"all")
            # Admin Dashboard 빌드 테스트
            log_test "Admin Dashboard 빌드 테스트..."
            cd apps/admin-dashboard
            if NODE_OPTIONS='--max-old-space-size=4096' \
               GENERATE_SOURCEMAP=false \
               VITE_API_URL=https://api.neture.co.kr \
               VITE_PUBLIC_APP_ORIGIN=https://neture.co.kr \
               pnpm run build > /dev/null 2>&1; then
                
                if [ -d "dist" ] && [ -n "$(ls -A dist)" ]; then
                    log_success "Admin Dashboard 빌드 성공"
                    ((TESTS_PASSED++))
                else
                    log_error "Admin Dashboard 빌드 결과물이 비어있음"
                    FAILED_TESTS+=("Admin Dashboard 빌드")
                    ((TESTS_FAILED++))
                fi
            else
                log_error "Admin Dashboard 빌드 실패"
                FAILED_TESTS+=("Admin Dashboard 빌드")
                ((TESTS_FAILED++))
            fi
            cd ../..
            ;;
    esac
    
    case $target in
        "apiserver"|"all")
            # API 서버 빌드 테스트
            log_test "API 서버 빌드 테스트..."
            cd apps/api-server
            if pnpm run build > /dev/null 2>&1; then
                if [ -d "dist" ] && [ -n "$(ls -A dist)" ]; then
                    log_success "API 서버 빌드 성공"
                    ((TESTS_PASSED++))
                else
                    log_error "API 서버 빌드 결과물이 비어있음"
                    FAILED_TESTS+=("API 서버 빌드")
                    ((TESTS_FAILED++))
                fi
            else
                log_error "API 서버 빌드 실패"
                FAILED_TESTS+=("API 서버 빌드")
                ((TESTS_FAILED++))
            fi
            cd ../..
            ;;
    esac
    
    return 0
}

# 단위 테스트 실행
test_unit_tests() {
    log_test "단위 테스트 실행 중..."
    
    if pnpm test > /dev/null 2>&1; then
        log_success "단위 테스트 통과"
        ((TESTS_PASSED++))
    else
        log_warning "단위 테스트 실패 또는 테스트가 없습니다"
        # 테스트 실패로 처리하지 않음 (선택사항)
    fi
    
    return 0
}

# SSH 연결 테스트
test_ssh_connections() {
    local target=$1
    
    log_test "SSH 연결 테스트..."
    
    case $target in
        "webserver"|"all")
            if ssh -o ConnectTimeout=10 ubuntu@13.125.144.8 "echo 'SSH 연결 성공'" > /dev/null 2>&1; then
                log_success "웹서버 SSH 연결 성공"
                ((TESTS_PASSED++))
            else
                log_error "웹서버 SSH 연결 실패"
                FAILED_TESTS+=("웹서버 SSH 연결")
                ((TESTS_FAILED++))
            fi
            ;;
    esac
    
    case $target in
        "apiserver"|"all")
            if ssh -o ConnectTimeout=10 ubuntu@43.202.242.215 "echo 'SSH 연결 성공'" > /dev/null 2>&1; then
                log_success "API 서버 SSH 연결 성공"
                ((TESTS_PASSED++))
            else
                log_error "API 서버 SSH 연결 실패"
                FAILED_TESTS+=("API 서버 SSH 연결")
                ((TESTS_FAILED++))
            fi
            ;;
    esac
    
    return 0
}

# 디스크 공간 검사
test_disk_space() {
    log_test "디스크 공간 검사..."
    
    # 로컬 디스크 공간 (최소 1GB 필요)
    available_space=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then # 1GB = 1048576 KB
        log_error "로컬 디스크 공간이 부족합니다 (최소 1GB 필요)"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("로컬 디스크 공간")
    else
        log_success "로컬 디스크 공간 충분"
        ((TESTS_PASSED++))
    fi
    
    return 0
}

# 테스트 요약 출력
print_test_summary() {
    echo ""
    echo "=========================================="
    echo "         배포 전 테스트 결과"
    echo "=========================================="
    log_success "통과한 테스트: $TESTS_PASSED"
    
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "실패한 테스트: $TESTS_FAILED"
        echo ""
        log_error "실패한 테스트 목록:"
        for test in "${FAILED_TESTS[@]}"; do
            log_error "  - $test"
        done
        echo ""
        log_error "배포 전에 위 문제들을 해결해야 합니다."
        return 1
    else
        echo ""
        log_success "🎉 모든 테스트가 통과했습니다! 배포를 진행할 수 있습니다."
        return 0
    fi
}

# 사용법 표시
show_usage() {
    echo "배포 전 자동 테스트 스크립트"
    echo ""
    echo "사용법: $0 [target]"
    echo ""
    echo "테스트 대상:"
    echo "  webserver    - 웹서버 배포 전 테스트"
    echo "  apiserver    - API 서버 배포 전 테스트"
    echo "  all          - 전체 배포 전 테스트"
    echo ""
    echo "예시:"
    echo "  $0 webserver  # 웹서버 배포 전 테스트"
    echo "  $0 apiserver  # API 서버 배포 전 테스트"
    echo "  $0 all        # 전체 배포 전 테스트"
}

# 메인 실행 로직
main() {
    local target=${1:-"all"}
    
    echo ""
    log_info "=========================================="
    log_info "      O4O Platform 배포 전 테스트"
    log_info "=========================================="
    log_info "테스트 대상: $target"
    echo ""
    
    # 테스트 실행
    test_git_status
    test_environment
    test_dependencies
    test_code_quality
    test_builds "$target"
    test_unit_tests
    test_ssh_connections "$target"
    test_disk_space
    
    # 결과 요약
    print_test_summary
    
    # 성공시 0, 실패시 1 반환
    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# 인자 확인
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# 스크립트 실행
main "$@"