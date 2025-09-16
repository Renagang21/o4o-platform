#!/bin/bash

# O4O Platform 통합 배포 스크립트
# 사용법: ./scripts/deploy-unified.sh [target] [component]
# 예시: 
#   ./scripts/deploy-unified.sh webserver admin
#   ./scripts/deploy-unified.sh apiserver
#   ./scripts/deploy-unified.sh nginx
#   ./scripts/deploy-unified.sh all

set -e

# 서버 정보
WEB_HOST="13.125.144.8"
API_HOST="43.202.242.215"
USER="ubuntu"

# 배포 로그 디렉토리
DEPLOY_LOG_DIR="$HOME/.o4o-deploy-logs"
DEPLOY_LOG_FILE="$DEPLOY_LOG_DIR/deploy-$(date +%Y%m%d_%H%M%S).log"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수들
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

# 로그 디렉토리 생성
mkdir -p "$DEPLOY_LOG_DIR"

# 사용법 표시
show_usage() {
    echo "O4O Platform 통합 배포 스크립트"
    echo ""
    echo "사용법: $0 [target] [component]"
    echo ""
    echo "배포 대상:"
    echo "  webserver [component]  - 웹서버 배포"
    echo "    admin               - Admin Dashboard만"
    echo "    storefront         - Storefront만"
    echo "    all                - 모든 웹 앱"
    echo ""
    echo "  apiserver             - API 서버 배포"
    echo "  nginx                 - Nginx 설정 배포"
    echo "  all                   - 전체 배포"
    echo ""
    echo "예시:"
    echo "  $0 webserver admin    # Admin Dashboard만 배포"
    echo "  $0 apiserver          # API 서버만 배포"
    echo "  $0 nginx              # Nginx 설정만 배포"
    echo "  $0 all                # 전체 배포"
}

# 배포 전 테스트 실행
run_pre_deploy_tests() {
    log_step "배포 전 테스트 실행 중..."
    
    # 1. 로컬 빌드 테스트
    log_test "로컬 빌드 테스트 실행..."
    if pnpm run build:packages > /dev/null 2>&1; then
        log_success "패키지 빌드 성공"
    else
        log_error "패키지 빌드 실패"
        return 1
    fi
    
    # 2. TypeScript 타입 체크
    log_test "TypeScript 타입 체크 실행..."
    if pnpm run type-check:frontend > /dev/null 2>&1; then
        log_success "타입 체크 통과"
    else
        log_error "타입 체크 실패"
        return 1
    fi
    
    # 3. ESLint 검사
    log_test "ESLint 검사 실행..."
    if pnpm run lint > /dev/null 2>&1; then
        log_success "ESLint 검사 통과"
    else
        log_error "ESLint 검사 실패"
        return 1
    fi
    
    # 4. console.log 검사
    log_test "console.log 검사 실행..."
    CONSOLE_LOGS=$(grep -r "console\.log" apps/ --include="*.ts" --include="*.tsx" \
      --exclude-dir=node_modules --exclude-dir=dist \
      --exclude-dir=test --exclude-dir=e2e \
      --exclude="*test*" --exclude="*spec*" \
      | grep -v "//.*console\.log" \
      | grep -v "^\s*//" \
      | grep -v "\*.*console\.log" || true)
    
    if [ -n "$CONSOLE_LOGS" ]; then
        log_error "프로덕션 코드에 console.log가 발견됨"
        echo "$CONSOLE_LOGS" | tee -a "$DEPLOY_LOG_FILE"
        return 1
    else
        log_success "console.log 검사 통과"
    fi
    
    log_success "모든 배포 전 테스트 통과"
    return 0
}

# SSH 연결 테스트
test_ssh_connection() {
    local host=$1
    local description=$2
    
    log_test "$description SSH 연결 테스트..."
    if ssh -o ConnectTimeout=10 ${USER}@${host} "echo 'SSH 연결 성공'" > /dev/null 2>&1; then
        log_success "$description SSH 연결 성공"
        return 0
    else
        log_error "$description SSH 연결 실패"
        return 1
    fi
}

# 웹서버 배포
deploy_webserver() {
    local component=${1:-"admin"}
    
    log_step "웹서버 배포 시작 (컴포넌트: $component)..."
    
    # SSH 연결 테스트
    if ! test_ssh_connection "$WEB_HOST" "웹서버"; then
        return 1
    fi
    
    case $component in
        "admin")
            log_info "Admin Dashboard 빌드 중..."
            cd apps/admin-dashboard
            NODE_OPTIONS='--max-old-space-size=4096' \
            GENERATE_SOURCEMAP=false \
            VITE_API_URL=https://api.neture.co.kr \
            VITE_PUBLIC_APP_ORIGIN=https://neture.co.kr \
            pnpm run build
            
            if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
                log_error "Admin Dashboard 빌드 실패"
                return 1
            fi
            
            log_info "Admin Dashboard 배포 중..."
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
            
            cd ../..
            log_success "Admin Dashboard 배포 완료"
            ;;
            
        "all")
            deploy_webserver "admin"
            # 향후 다른 웹 앱들 추가 가능
            ;;
            
        *)
            log_error "알 수 없는 웹서버 컴포넌트: $component"
            return 1
            ;;
    esac
}

# API 서버 배포
deploy_apiserver() {
    log_step "API 서버 배포 시작..."
    
    # SSH 연결 테스트
    if ! test_ssh_connection "$API_HOST" "API 서버"; then
        return 1
    fi
    
    log_info "API 서버에 배포 중..."
    
    ssh ${USER}@${API_HOST} "
        set -e
        
        cd /home/ubuntu/o4o-platform
        
        echo '🔄 최신 코드 가져오기...'
        git fetch origin
        git config pull.rebase false
        git pull origin main
        
        echo '📦 pnpm 설치 확인...'
        if ! command -v pnpm &> /dev/null; then
            echo '📦 pnpm 설치 중...'
            npm install -g pnpm
            export PATH=\"\$PATH:\$(npm config get prefix)/bin\"
        fi
        
        echo '📥 의존성 설치...'
        pnpm install --frozen-lockfile
        
        echo '🏗️  패키지 빌드...'
        pnpm run build:packages
        
        echo '🏗️  API 서버 빌드...'
        cd apps/api-server
        pnpm run build
        
        if [ ! -d \"dist\" ] || [ -z \"\$(ls -A dist)\" ]; then
            echo '❌ 빌드 실패: dist 폴더가 비어있음'
            exit 1
        fi
        
        echo '✅ API 서버 빌드 완료!'
        
        echo '🗄️  데이터베이스 마이그레이션 확인...'
        if pnpm run migration:show 2>/dev/null | grep -q \"No pending migrations\"; then
            echo '📝 대기 중인 마이그레이션 없음'
        else
            echo '🔄 데이터베이스 마이그레이션 실행...'
            pnpm run migration:run
        fi
        
        echo '♻️  PM2 API 서버 재시작...'
        cd ../..
        
        pm2 list | grep -q \"o4o-api-server\" || echo '⚠️  PM2 프로세스 o4o-api-server를 찾을 수 없음'
        
        if pm2 restart ecosystem.config.apiserver.cjs 2>/dev/null; then
            echo '✅ PM2 재시작 성공'
        else
            echo '🔧 PM2 설정 파일로 시작...'
            pm2 start ecosystem.config.apiserver.cjs
        fi
        
        echo '🏥 헬스 체크...'
        sleep 3
        
        if curl -f http://localhost:3001/health 2>/dev/null; then
            echo '✅ API 서버가 정상적으로 실행 중'
        else
            echo '⚠️  헬스 체크 실패 - 로그 확인 필요'
            echo '📋 PM2 로그: pm2 logs o4o-api-server'
        fi
        
        echo '🎉 API 서버 배포 완료!'
        echo '🌐 Local: http://localhost:3001'
        echo '🌐 External: https://api.neture.co.kr'
        echo \"📅 배포 시간: \$(date)\"
        echo \"📝 커밋: \$(git rev-parse HEAD)\"
    "
    
    log_success "API 서버 배포 완료"
}

# Nginx 설정 배포
deploy_nginx() {
    log_step "Nginx 설정 배포 시작..."
    
    # SSH 연결 테스트
    if ! test_ssh_connection "$WEB_HOST" "웹서버"; then
        return 1
    fi
    
    log_info "Nginx 설정 배포 중..."
    
    ssh ${USER}@${WEB_HOST} "
        set -e
        
        BACKUP_DIR=\"/etc/nginx/backup/\$(date +%Y%m%d_%H%M%S)\"
        sudo mkdir -p \"\$BACKUP_DIR\"
        
        echo '📁 기존 설정 백업 중...'
        sudo cp -r /etc/nginx/sites-available \"\$BACKUP_DIR/\" || true
        sudo cp -r /etc/nginx/sites-enabled \"\$BACKUP_DIR/\" || true
        
        cd /home/ubuntu/o4o-platform
        
        echo '🔄 최신 nginx 설정 가져오기...'
        git fetch origin
        git config pull.rebase false
        git pull origin main
        
        echo '📋 nginx 설정 파일 배포 중...'
        sudo cp nginx-configs/admin.neture.co.kr.conf /etc/nginx/sites-available/
        sudo cp nginx-configs/neture.co.kr.conf /etc/nginx/sites-available/ || true
        sudo cp nginx-configs/forum.neture.co.kr.conf /etc/nginx/sites-available/ || true
        sudo cp nginx-configs/shop.neture.co.kr.conf /etc/nginx/sites-available/ || true
        sudo cp nginx-configs/signage.neture.co.kr.conf /etc/nginx/sites-available/ || true
        
        echo '🔗 사이트 활성화...'
        sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/ || true
        sudo ln -sf /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/ || true
        sudo ln -sf /etc/nginx/sites-available/forum.neture.co.kr.conf /etc/nginx/sites-enabled/ || true
        sudo ln -sf /etc/nginx/sites-available/shop.neture.co.kr.conf /etc/nginx/sites-enabled/ || true
        sudo ln -sf /etc/nginx/sites-available/signage.neture.co.kr.conf /etc/nginx/sites-enabled/ || true
        
        echo '🧪 nginx 설정 테스트...'
        if sudo nginx -t; then
            echo '✅ Nginx 설정 테스트 통과'
            
            echo '🔄 nginx 재로드...'
            sudo systemctl reload nginx
            
            if sudo systemctl is-active --quiet nginx; then
                echo '✅ Nginx 재로드 성공!'
                echo \"📅 배포 시간: \$(date)\"
                echo \"📝 커밋: \$(git rev-parse HEAD)\"
            else
                echo '❌ Nginx 재로드 실패'
                exit 1
            fi
        else
            echo '❌ Nginx 설정 테스트 실패!'
            echo '🔙 백업으로 롤백...'
            sudo cp -r \"\$BACKUP_DIR/sites-available\"/* /etc/nginx/sites-available/
            sudo cp -r \"\$BACKUP_DIR/sites-enabled\"/* /etc/nginx/sites-enabled/
            sudo systemctl reload nginx
            exit 1
        fi
        
        echo '🧹 오래된 백업 정리...'
        sudo find /etc/nginx/backup -type d -name \"20*\" | sort -r | tail -n +6 | sudo xargs rm -rf || true
        
        echo '🎉 Nginx 배포 완료!'
    "
    
    log_success "Nginx 설정 배포 완료"
}

# 배포 상태 모니터링
monitor_deployment() {
    log_step "배포 상태 모니터링..."
    
    # API 서버 헬스 체크
    if curl -f https://api.neture.co.kr/health > /dev/null 2>&1; then
        log_success "API 서버 헬스 체크 통과"
    else
        log_warning "API 서버 헬스 체크 실패"
    fi
    
    # 웹사이트 접근 테스트
    if curl -f https://admin.neture.co.kr > /dev/null 2>&1; then
        log_success "Admin Dashboard 접근 가능"
    else
        log_warning "Admin Dashboard 접근 실패"
    fi
    
    if curl -f https://neture.co.kr > /dev/null 2>&1; then
        log_success "메인 웹사이트 접근 가능"
    else
        log_warning "메인 웹사이트 접근 실패"
    fi
}

# 배포 요약 출력
print_deployment_summary() {
    local start_time=$1
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_success "=========================================="
    log_success "         배포 완료 요약"
    log_success "=========================================="
    log_info "배포 시작 시간: $(date -d @$start_time)"
    log_info "배포 완료 시간: $(date -d @$end_time)"
    log_info "총 소요 시간: ${duration}초"
    log_info "배포 로그: $DEPLOY_LOG_FILE"
    echo ""
    
    # 배포 상태 모니터링
    monitor_deployment
    
    echo ""
    log_info "🔗 서비스 URL:"
    log_info "  • Admin Dashboard: https://admin.neture.co.kr"
    log_info "  • API Server: https://api.neture.co.kr"
    log_info "  • Main Website: https://neture.co.kr"
    echo ""
}

# 메인 실행 로직
main() {
    local start_time=$(date +%s)
    
    echo ""
    log_info "=========================================="
    log_info "       O4O Platform 통합 배포 시스템"
    log_info "=========================================="
    log_info "배포 로그: $DEPLOY_LOG_FILE"
    echo ""
    
    # 인자 확인
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    local target=$1
    local component=$2
    
    # 배포 전 테스트 실행
    log_step "배포 전 검증 단계..."
    if ! run_pre_deploy_tests; then
        log_error "배포 전 테스트 실패 - 배포를 중단합니다"
        exit 1
    fi
    
    # 배포 실행
    case $target in
        "webserver")
            deploy_webserver "$component"
            ;;
        "apiserver")
            deploy_apiserver
            ;;
        "nginx")
            deploy_nginx
            ;;
        "all")
            log_step "전체 배포 시작..."
            deploy_apiserver
            deploy_webserver "admin"
            deploy_nginx
            ;;
        *)
            log_error "알 수 없는 배포 대상: $target"
            show_usage
            exit 1
            ;;
    esac
    
    # 배포 완료 요약
    print_deployment_summary "$start_time"
    
    log_success "🎉 배포가 성공적으로 완료되었습니다!"
}

# 스크립트 실행
main "$@"