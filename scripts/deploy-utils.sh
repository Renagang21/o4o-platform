#!/bin/bash

# O4O Platform 배포 유틸리티 스크립트
# 배포 관련 편의 기능들을 제공합니다.
# 사용법: source ./scripts/deploy-utils.sh (다른 스크립트에서 사용)
#        또는 ./scripts/deploy-utils.sh [command]

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 공통 변수
WEB_HOST="13.125.144.8"
API_HOST="43.202.242.215"
USER="ubuntu"
DEPLOY_LOG_DIR="$HOME/.o4o-deploy-logs"

# 배포 로그 초기화
init_deploy_logging() {
    local log_name=${1:-"deploy"}
    
    mkdir -p "$DEPLOY_LOG_DIR"
    CURRENT_DEPLOY_LOG="$DEPLOY_LOG_DIR/${log_name}-$(date +%Y%m%d_%H%M%S).log"
    
    echo "$(date): 배포 로깅 시작 - $log_name" >> "$CURRENT_DEPLOY_LOG"
    echo "배포 로그: $CURRENT_DEPLOY_LOG"
}

# 공통 로그 함수들
log_info() {
    local message="$1"
    echo -e "${BLUE}ℹ️  $message${NC}"
    [ -n "$CURRENT_DEPLOY_LOG" ] && echo "$(date): [INFO] $message" >> "$CURRENT_DEPLOY_LOG"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}✅ $message${NC}"
    [ -n "$CURRENT_DEPLOY_LOG" ] && echo "$(date): [SUCCESS] $message" >> "$CURRENT_DEPLOY_LOG"
}

log_error() {
    local message="$1"
    echo -e "${RED}❌ $message${NC}"
    [ -n "$CURRENT_DEPLOY_LOG" ] && echo "$(date): [ERROR] $message" >> "$CURRENT_DEPLOY_LOG"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠️  $message${NC}"
    [ -n "$CURRENT_DEPLOY_LOG" ] && echo "$(date): [WARNING] $message" >> "$CURRENT_DEPLOY_LOG"
}

log_step() {
    local message="$1"
    echo -e "${PURPLE}🚀 $message${NC}"
    [ -n "$CURRENT_DEPLOY_LOG" ] && echo "$(date): [STEP] $message" >> "$CURRENT_DEPLOY_LOG"
}

log_test() {
    local message="$1"
    echo -e "${CYAN}🧪 $message${NC}"
    [ -n "$CURRENT_DEPLOY_LOG" ] && echo "$(date): [TEST] $message" >> "$CURRENT_DEPLOY_LOG"
}

# SSH 연결 테스트
test_ssh_connection() {
    local host=$1
    local description=$2
    local timeout=${3:-10}
    
    if ssh -o ConnectTimeout=$timeout ${USER}@${host} "echo 'SSH 연결 성공'" > /dev/null 2>&1; then
        log_success "$description SSH 연결 성공"
        return 0
    else
        log_error "$description SSH 연결 실패"
        return 1
    fi
}

# 서비스 헬스체크
check_service_health() {
    local url=$1
    local service_name=$2
    local timeout=${3:-10}
    
    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        log_success "$service_name: 정상 동작"
        return 0
    else
        log_error "$service_name: 접근 불가"
        return 1
    fi
}

# 배포 완료 알림
notify_deployment_complete() {
    local deployment_type=$1
    local status=$2
    local duration=$3
    
    if [ "$status" = "success" ]; then
        log_success "🎉 $deployment_type 배포가 성공적으로 완료되었습니다!"
        log_info "소요 시간: ${duration}초"
    else
        log_error "💥 $deployment_type 배포가 실패했습니다."
        log_info "소요 시간: ${duration}초"
        log_info "로그 확인: $CURRENT_DEPLOY_LOG"
    fi
}

# Git 상태 확인
check_git_clean() {
    if ! git diff-index --quiet HEAD --; then
        log_error "커밋되지 않은 변경사항이 있습니다"
        git status --short
        return 1
    fi
    
    # 원격과 동기화 확인
    git fetch origin main > /dev/null 2>&1
    local local_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/main)
    
    if [ "$local_commit" != "$remote_commit" ]; then
        log_warning "로컬과 원격이 동기화되지 않았습니다"
        return 1
    fi
    
    log_success "Git 상태: 깨끗함"
    return 0
}

# PM2 프로세스 상태 확인
check_pm2_process() {
    local host=$1
    local process_name=$2
    
    if ssh ${USER}@${host} "pm2 list | grep -q '$process_name'" 2>/dev/null; then
        local status=$(ssh ${USER}@${host} "pm2 list | grep '$process_name' | awk '{print \$10}'" 2>/dev/null)
        if [ "$status" = "online" ]; then
            log_success "PM2 프로세스 '$process_name': 실행 중"
            return 0
        else
            log_error "PM2 프로세스 '$process_name': $status"
            return 1
        fi
    else
        log_error "PM2 프로세스 '$process_name': 찾을 수 없음"
        return 1
    fi
}

# 빌드 디렉토리 검증
validate_build_output() {
    local build_dir=$1
    local app_name=$2
    
    if [ ! -d "$build_dir" ]; then
        log_error "$app_name 빌드 디렉토리가 없습니다: $build_dir"
        return 1
    fi
    
    if [ -z "$(ls -A "$build_dir")" ]; then
        log_error "$app_name 빌드 디렉토리가 비어있습니다: $build_dir"
        return 1
    fi
    
    log_success "$app_name 빌드 출력 검증 완료"
    return 0
}

# 백업 생성
create_backup() {
    local host=$1
    local source_path=$2
    local backup_name=$3
    
    local backup_path="${source_path}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if ssh ${USER}@${host} "sudo cp -r '$source_path' '$backup_path'" 2>/dev/null; then
        log_success "$backup_name 백업 생성: $backup_path"
        echo "$backup_path"
        return 0
    else
        log_error "$backup_name 백업 생성 실패"
        return 1
    fi
}

# 백업에서 복원
restore_from_backup() {
    local host=$1
    local backup_path=$2
    local restore_path=$3
    local service_name=$4
    
    log_warning "$service_name 백업에서 복원 중..."
    
    if ssh ${USER}@${host} "sudo rm -rf '$restore_path' && sudo cp -r '$backup_path' '$restore_path'" 2>/dev/null; then
        log_success "$service_name 백업 복원 완료"
        return 0
    else
        log_error "$service_name 백업 복원 실패"
        return 1
    fi
}

# 오래된 백업 정리
cleanup_old_backups() {
    local host=$1
    local backup_pattern=$2
    local keep_count=${3:-5}
    
    log_info "오래된 백업 정리 중... (최근 ${keep_count}개 유지)"
    
    ssh ${USER}@${host} "
        find $(dirname $backup_pattern) -name '$(basename $backup_pattern)' -type d 2>/dev/null | 
        sort -r | tail -n +$((keep_count + 1)) | 
        sudo xargs rm -rf
    " 2>/dev/null || log_warning "백업 정리 중 일부 오류 발생"
}

# 시스템 리소스 체크
check_system_resources() {
    local host=$1
    local min_free_mb=${2:-1024}  # 최소 1GB
    
    local available_mb=$(ssh ${USER}@${host} "df / | awk 'NR==2 {print int(\$4/1024)}'" 2>/dev/null)
    
    if [ "$available_mb" -lt "$min_free_mb" ]; then
        log_error "디스크 공간 부족: ${available_mb}MB 남음 (최소 ${min_free_mb}MB 필요)"
        return 1
    else
        log_success "디스크 공간 충분: ${available_mb}MB 사용 가능"
        return 0
    fi
}

# Nginx 설정 테스트
test_nginx_config() {
    local host=$1
    
    if ssh ${USER}@${host} "sudo nginx -t" > /dev/null 2>&1; then
        log_success "Nginx 설정 테스트 통과"
        return 0
    else
        log_error "Nginx 설정 테스트 실패"
        ssh ${USER}@${host} "sudo nginx -t" 2>&1 | head -5
        return 1
    fi
}

# 서비스 재시작 및 확인
restart_service() {
    local host=$1
    local service_name=$2
    local service_type=$3  # systemd, pm2
    local process_name=${4:-$service_name}
    
    case $service_type in
        "systemd")
            if ssh ${USER}@${host} "sudo systemctl restart $service_name" 2>/dev/null; then
                sleep 2
                if ssh ${USER}@${host} "sudo systemctl is-active --quiet $service_name" 2>/dev/null; then
                    log_success "$service_name 재시작 성공"
                    return 0
                else
                    log_error "$service_name 재시작 후 비정상 상태"
                    return 1
                fi
            else
                log_error "$service_name 재시작 실패"
                return 1
            fi
            ;;
        "pm2")
            if ssh ${USER}@${host} "pm2 restart $process_name" > /dev/null 2>&1; then
                sleep 3
                if ssh ${USER}@${host} "pm2 list | grep '$process_name' | grep -q 'online'" 2>/dev/null; then
                    log_success "$service_name PM2 재시작 성공"
                    return 0
                else
                    log_error "$service_name PM2 재시작 후 비정상 상태"
                    return 1
                fi
            else
                log_error "$service_name PM2 재시작 실패"
                return 1
            fi
            ;;
        *)
            log_error "알 수 없는 서비스 타입: $service_type"
            return 1
            ;;
    esac
}

# 배포 전체 시간 측정
start_timer() {
    DEPLOY_START_TIME=$(date +%s)
}

get_elapsed_time() {
    local end_time=$(date +%s)
    echo $((end_time - DEPLOY_START_TIME))
}

# 배포 로그 압축 및 아카이브
archive_old_logs() {
    local days_old=${1:-30}
    
    if [ -d "$DEPLOY_LOG_DIR" ]; then
        log_info "30일 이상된 배포 로그 압축 중..."
        
        find "$DEPLOY_LOG_DIR" -name "*.log" -mtime +$days_old -type f | while read -r logfile; do
            gzip "$logfile" 2>/dev/null && log_success "압축 완료: $(basename $logfile).gz"
        done
        
        # 90일 이상된 압축 로그 삭제
        find "$DEPLOY_LOG_DIR" -name "*.log.gz" -mtime +90 -delete 2>/dev/null
        
        log_success "배포 로그 아카이브 완료"
    fi
}

# 명령행에서 직접 실행된 경우
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    case "${1:-help}" in
        "init-logging")
            init_deploy_logging "$2"
            ;;
        "check-ssh")
            test_ssh_connection "$WEB_HOST" "웹서버"
            test_ssh_connection "$API_HOST" "API서버"
            ;;
        "health-check")
            check_service_health "https://api.neture.co.kr/health" "API 서버"
            check_service_health "https://admin.neture.co.kr" "Admin Dashboard"
            check_service_health "https://neture.co.kr" "메인 웹사이트"
            ;;
        "archive-logs")
            archive_old_logs "${2:-30}"
            ;;
        "help"|*)
            echo "O4O Platform 배포 유틸리티 스크립트"
            echo ""
            echo "사용법: $0 [command] [options]"
            echo ""
            echo "명령어:"
            echo "  init-logging [name]    - 배포 로깅 초기화"
            echo "  check-ssh             - SSH 연결 테스트"
            echo "  health-check          - 서비스 헬스체크"
            echo "  archive-logs [days]   - 오래된 로그 아카이브 (기본 30일)"
            echo ""
            echo "이 스크립트는 주로 다른 스크립트에서 source로 로드하여 사용합니다:"
            echo "  source ./scripts/deploy-utils.sh"
            ;;
    esac
fi