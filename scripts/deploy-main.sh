#!/bin/bash

# O4O Platform Main Deployment Script
# 표준화된 배포 시스템 - 모든 배포 작업의 진입점
# 사용법: ./scripts/deploy-main.sh [target] [options]

set -e

# =============================================================================
# 설정 및 환경 변수
# =============================================================================

# 스크립트 위치 및 프로젝트 루트
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 서버 정보
API_HOST="43.202.242.215"
WEB_HOST="13.125.144.8"
USER="ubuntu"

# SSH 별칭
API_SERVER="o4o-apiserver"
WEB_SERVER="webserver"

# 로그 디렉토리
DEPLOY_LOG_DIR="$HOME/.o4o-deploy-logs"
DEPLOY_LOG_FILE="$DEPLOY_LOG_DIR/deploy-$(date +%Y%m%d_%H%M%S).log"

# 옵션 기본값
SKIP_BUILD=false
SKIP_TESTS=false
FORCE_DEPLOY=false
DRY_RUN=false

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# 로그 및 출력 함수
# =============================================================================

# 로그 디렉토리 생성
mkdir -p "$DEPLOY_LOG_DIR"

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$DEPLOY_LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOY_LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOY_LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOY_LOG_FILE"
}

log_step() {
    echo -e "${PURPLE}🚀 $1${NC}" | tee -a "$DEPLOY_LOG_FILE"
}

log_test() {
    echo -e "${CYAN}🧪 $1${NC}" | tee -a "$DEPLOY_LOG_FILE"
}

print_header() {
    echo -e "\n${BOLD}${BLUE}=================================${NC}"
    echo -e "${BOLD}${BLUE}  O4O Platform 배포 시스템${NC}"
    echo -e "${BOLD}${BLUE}=================================${NC}\n"
    log_info "배포 로그: $DEPLOY_LOG_FILE"
    log_info "시작 시간: $(date)"
    echo ""
}

print_usage() {
    cat << EOF
O4O Platform 배포 스크립트

사용법: $0 [target] [options]

배포 대상:
  api              API 서버만 배포
  web              웹 서버만 배포 (admin dashboard)
  nginx            Nginx 설정만 배포
  all              전체 시스템 배포 (기본값)

옵션:
  --skip-build     빌드 과정 건너뛰기
  --skip-tests     배포 전 테스트 건너뛰기
  --force          강제 배포 (확인 없이 진행)
  --dry-run        실제 배포 없이 시뮬레이션만
  --help           이 도움말 표시

예시:
  $0                           # 전체 배포
  $0 api                      # API 서버만 배포
  $0 web --skip-build         # 웹 서버만 배포 (빌드 스킵)
  $0 all --skip-tests         # 전체 배포 (테스트 스킵)
  $0 nginx --dry-run          # Nginx 설정 시뮬레이션

EOF
}

# =============================================================================
# 유틸리티 함수
# =============================================================================

# SSH 연결 테스트
test_ssh_connection() {
    local host=$1
    local description=$2
    
    log_test "$description SSH 연결 테스트..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "(DRY RUN) SSH 연결 테스트 시뮬레이션"
        return 0
    fi
    
    if ssh -o ConnectTimeout=10 ${USER}@${host} "echo 'SSH 연결 성공'" > /dev/null 2>&1; then
        log_success "$description SSH 연결 성공"
        return 0
    else
        log_error "$description SSH 연결 실패"
        return 1
    fi
}

# 확인 프롬프트
confirm_deployment() {
    if [ "$FORCE_DEPLOY" = true ] || [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    echo ""
    read -p "배포를 계속하시겠습니까? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "사용자가 배포를 취소했습니다"
        exit 0
    fi
}

# =============================================================================
# 배포 전 검증
# =============================================================================

run_pre_deploy_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "배포 전 테스트를 건너뜁니다"
        return 0
    fi
    
    log_step "배포 전 검증 단계 실행 중..."
    
    cd "$PROJECT_ROOT"
    
    # 1. Git 상태 확인
    log_test "Git 상태 확인..."
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "커밋되지 않은 변경사항이 있습니다"
        git status --short
    else
        log_success "Git 상태 깨끗함"
    fi
    
    # 2. 패키지 빌드 테스트
    log_test "패키지 빌드 테스트..."
    if pnpm run build:packages > /dev/null 2>&1; then
        log_success "패키지 빌드 성공"
    else
        log_error "패키지 빌드 실패"
        return 1
    fi
    
    # 3. TypeScript 타입 체크
    log_test "TypeScript 타입 체크..."
    if pnpm run type-check:frontend > /dev/null 2>&1; then
        log_success "타입 체크 통과"
    else
        log_error "타입 체크 실패"
        return 1
    fi
    
    # 4. ESLint 검사
    log_test "ESLint 검사..."
    if pnpm run lint > /dev/null 2>&1; then
        log_success "ESLint 검사 통과"
    else
        log_error "ESLint 검사 실패"
        return 1
    fi
    
    # 5. 프로덕션 코드 console.log 검사
    log_test "프로덕션 코드 console.log 검사..."
    CONSOLE_LOGS=$(grep -r "console\.log" apps/ --include="*.ts" --include="*.tsx" \
      --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=test --exclude-dir=e2e \
      --exclude="*test*" --exclude="*spec*" \
      | grep -v "//.*console\.log" | grep -v "^\s*//" | grep -v "\*.*console\.log" || true)
    
    if [ -n "$CONSOLE_LOGS" ]; then
        log_error "프로덕션 코드에 console.log 발견:"
        echo "$CONSOLE_LOGS" | head -10
        return 1
    else
        log_success "console.log 검사 통과"
    fi
    
    log_success "모든 배포 전 검증 통과"
    return 0
}

# =============================================================================
# 빌드 함수
# =============================================================================

build_project() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "빌드 과정을 건너뜁니다"
        return 0
    fi
    
    log_step "프로젝트 빌드 시작..."
    cd "$PROJECT_ROOT"
    
    # 의존성 설치 확인
    if [ ! -d "node_modules" ]; then
        log_info "의존성 설치 중..."
        pnpm install
    fi
    
    # 패키지 빌드
    log_info "패키지 빌드 중..."
    pnpm run build:packages
    
    log_success "빌드 완료"
}

# =============================================================================
# API 서버 배포
# =============================================================================

deploy_api_server() {
    log_step "API 서버 배포 시작..."
    
    # SSH 연결 테스트
    if ! test_ssh_connection "$API_HOST" "API 서버"; then
        return 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "(DRY RUN) API 서버 배포 시뮬레이션"
        return 0
    fi
    
    log_info "API 서버에 배포 중..."
    
    ssh ${USER}@${API_HOST} << 'ENDSSH'
        set -e
        
        cd /home/ubuntu/o4o-platform
        
        echo "🔄 최신 코드 가져오기..."
        git fetch origin
        git config pull.rebase false
        git pull origin main
        
        echo "📦 pnpm 설치 확인..."
        if ! command -v pnpm &> /dev/null; then
            echo "📦 pnpm 설치 중..."
            npm install -g pnpm
        fi
        
        echo "📥 의존성 설치..."
        pnpm install --frozen-lockfile
        
        echo "🏗️ 패키지 빌드..."
        pnpm run build:packages
        
        echo "🏗️ API 서버 빌드..."
        cd apps/api-server
        pnpm run build
        
        if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
            echo "❌ 빌드 실패: dist 폴더가 비어있음"
            exit 1
        fi
        
        echo "🗄️ 데이터베이스 마이그레이션 확인..."
        if pnpm run migration:show 2>/dev/null | grep -q "No pending migrations"; then
            echo "📝 대기 중인 마이그레이션 없음"
        else
            echo "🔄 데이터베이스 마이그레이션 실행..."
            pnpm run migration:run
        fi
        
        echo "♻️ PM2 API 서버 재시작..."
        cd ../..
        
        if pm2 restart ecosystem.config.apiserver.cjs 2>/dev/null; then
            echo "✅ PM2 재시작 성공"
        else
            echo "🔧 PM2 설정으로 시작..."
            pm2 start ecosystem.config.apiserver.cjs
        fi
        
        echo "🏥 헬스 체크..."
        sleep 3
        
        if curl -f http://localhost:3001/health 2>/dev/null; then
            echo "✅ API 서버가 정상적으로 실행 중"
        else
            echo "⚠️ 헬스 체크 실패 - 로그 확인 필요"
        fi
        
        echo "🎉 API 서버 배포 완료!"
ENDSSH
    
    log_success "API 서버 배포 완료"
}

# =============================================================================
# 웹 서버 배포
# =============================================================================

deploy_web_server() {
    log_step "웹 서버 배포 시작..."
    
    # SSH 연결 테스트
    if ! test_ssh_connection "$WEB_HOST" "웹 서버"; then
        return 1
    fi
    
    # Admin Dashboard 빌드
    log_info "Admin Dashboard 빌드 중..."
    cd "$PROJECT_ROOT/apps/admin-dashboard"
    
    NODE_OPTIONS='--max-old-space-size=4096' \
    GENERATE_SOURCEMAP=false \
    VITE_API_URL=https://api.neture.co.kr \
    VITE_PUBLIC_APP_ORIGIN=https://neture.co.kr \
    pnpm run build
    
    if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
        log_error "Admin Dashboard 빌드 실패"
        return 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "(DRY RUN) 웹 서버 배포 시뮬레이션"
        cd "$PROJECT_ROOT"
        return 0
    fi
    
    log_info "웹 서버에 배포 중..."
    
    # 백업 및 배포
    ssh ${USER}@${WEB_HOST} "
        sudo cp -r /var/www/admin.neture.co.kr /var/www/admin.neture.co.kr.backup.\$(date +%Y%m%d_%H%M%S) || true
        sudo rm -rf /var/www/admin.neture.co.kr/*
        mkdir -p /tmp/admin-build
    "
    
    # 파일 전송
    scp -r dist/* ${USER}@${WEB_HOST}:/tmp/admin-build/
    
    # 파일 이동 및 권한 설정
    ssh ${USER}@${WEB_HOST} "
        sudo cp -r /tmp/admin-build/* /var/www/admin.neture.co.kr/
        sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
        sudo chmod -R 755 /var/www/admin.neture.co.kr/
        rm -rf /tmp/admin-build
        sudo systemctl reload nginx
    "
    
    cd "$PROJECT_ROOT"
    log_success "웹 서버 배포 완료"
}

# =============================================================================
# Nginx 설정 배포
# =============================================================================

deploy_nginx() {
    log_step "Nginx 설정 배포 시작..."
    
    # SSH 연결 테스트
    if ! test_ssh_connection "$WEB_HOST" "웹 서버"; then
        return 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "(DRY RUN) Nginx 설정 배포 시뮬레이션"
        return 0
    fi
    
    log_info "Nginx 설정 배포 중..."
    
    ssh ${USER}@${WEB_HOST} << 'ENDSSH'
        set -e
        
        BACKUP_DIR="/etc/nginx/backup/$(date +%Y%m%d_%H%M%S)"
        sudo mkdir -p "$BACKUP_DIR"
        
        echo "📁 기존 설정 백업..."
        sudo cp -r /etc/nginx/sites-available "$BACKUP_DIR/" || true
        sudo cp -r /etc/nginx/sites-enabled "$BACKUP_DIR/" || true
        
        cd /home/ubuntu/o4o-platform
        
        echo "🔄 최신 설정 가져오기..."
        git fetch origin
        git config pull.rebase false
        git pull origin main
        
        echo "📋 Nginx 설정 배포..."
        if [ -f "nginx-configs/admin.neture.co.kr.conf" ]; then
            sudo cp nginx-configs/admin.neture.co.kr.conf /etc/nginx/sites-available/
            sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/
        fi
        
        echo "🧪 Nginx 설정 테스트..."
        if sudo nginx -t; then
            echo "✅ Nginx 설정 테스트 통과"
            sudo systemctl reload nginx
            echo "✅ Nginx 재로드 완료"
        else
            echo "❌ Nginx 설정 테스트 실패!"
            sudo cp -r "$BACKUP_DIR/sites-available"/* /etc/nginx/sites-available/
            sudo cp -r "$BACKUP_DIR/sites-enabled"/* /etc/nginx/sites-enabled/
            sudo systemctl reload nginx
            exit 1
        fi
        
        echo "🎉 Nginx 설정 배포 완료!"
ENDSSH
    
    log_success "Nginx 설정 배포 완료"
}

# =============================================================================
# 배포 상태 모니터링
# =============================================================================

monitor_deployment() {
    log_step "배포 상태 모니터링..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "(DRY RUN) 모니터링 시뮬레이션"
        return 0
    fi
    
    # API 서버 헬스 체크
    if curl -f https://api.neture.co.kr/health > /dev/null 2>&1; then
        log_success "API 서버 헬스 체크 통과"
    else
        log_warning "API 서버 헬스 체크 실패"
    fi
    
    # Admin Dashboard 접근 테스트
    if curl -f https://admin.neture.co.kr > /dev/null 2>&1; then
        log_success "Admin Dashboard 접근 가능"
    else
        log_warning "Admin Dashboard 접근 실패"
    fi
}

# =============================================================================
# 메인 실행 로직
# =============================================================================

main() {
    local start_time=$(date +%s)
    
    # 인자 파싱
    TARGET="all"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            api|web|nginx|all)
                TARGET="$1"
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                print_usage
                exit 0
                ;;
            *)
                log_error "알 수 없는 옵션: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # 헤더 출력
    print_header
    
    log_info "배포 대상: $TARGET"
    [ "$SKIP_BUILD" = true ] && log_info "빌드 건너뜀: 예"
    [ "$SKIP_TESTS" = true ] && log_info "테스트 건너뜀: 예"
    [ "$FORCE_DEPLOY" = true ] && log_info "강제 배포: 예"
    [ "$DRY_RUN" = true ] && log_info "DRY RUN 모드: 예"
    
    # 배포 전 검증
    if ! run_pre_deploy_tests; then
        log_error "배포 전 검증 실패 - 배포를 중단합니다"
        exit 1
    fi
    
    # 빌드 실행
    build_project
    
    # 배포 확인
    confirm_deployment
    
    # 배포 실행
    case $TARGET in
        api)
            deploy_api_server
            ;;
        web)
            deploy_web_server
            ;;
        nginx)
            deploy_nginx
            ;;
        all)
            deploy_api_server
            deploy_web_server
            deploy_nginx
            ;;
        *)
            log_error "알 수 없는 배포 대상: $TARGET"
            exit 1
            ;;
    esac
    
    # 배포 상태 모니터링
    monitor_deployment
    
    # 완료 요약
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_success "=========================================="
    log_success "         배포 완료!"
    log_success "=========================================="
    log_info "배포 대상: $TARGET"
    log_info "소요 시간: ${duration}초"
    log_info "배포 로그: $DEPLOY_LOG_FILE"
    echo ""
    log_info "🔗 서비스 URL:"
    log_info "  • Admin Dashboard: https://admin.neture.co.kr"
    log_info "  • API Server: https://api.neture.co.kr"
    echo ""
}

# 스크립트 실행
main "$@"