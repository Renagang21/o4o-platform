#!/bin/bash

# ============================================
# O4O Platform 통합 모니터링 시스템 시작 스크립트
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 모니터링 시스템 시작 함수
start_monitoring() {
    log_info "O4O Platform 통합 모니터링 시스템 시작..."
    
    # PM2로 모니터링 서비스들 시작
    cd "$PROJECT_ROOT"
    
    # 로그 디렉토리 설정
    export LOG_DIR="$PROJECT_ROOT/logs"
    mkdir -p "$LOG_DIR/performance"
    
    # 성능 모니터 시작
    log_info "성능 모니터 시작 중..."
    LOG_DIR="$LOG_DIR" npx pm2 start scripts/performance-monitor.cjs --name "o4o-performance-monitor" || {
        log_warning "성능 모니터가 이미 실행 중이거나 재시작 중..."
        npx pm2 restart o4o-performance-monitor 2>/dev/null || true
    }
    
    # 알림 시스템 시작
    log_info "알림 시스템 시작 중..."
    LOG_DIR="$LOG_DIR" npx pm2 start scripts/notification-system.cjs --name "o4o-notification-system" || {
        log_warning "알림 시스템이 이미 실행 중이거나 재시작 중..."
        npx pm2 restart o4o-notification-system 2>/dev/null || true
    }
    
    # 모니터링 대시보드 시작
    log_info "모니터링 대시보드 시작 중..."
    LOG_DIR="$LOG_DIR" npx pm2 start scripts/monitoring-dashboard.cjs --name "o4o-monitoring-dashboard" || {
        log_warning "모니터링 대시보드가 이미 실행 중이거나 재시작 중..."
        npx pm2 restart o4o-monitoring-dashboard 2>/dev/null || true
    }
    
    # PM2 상태 저장
    npx pm2 save
    
    log_success "모니터링 시스템이 성공적으로 시작되었습니다!"
    
    # 서비스 상태 확인
    sleep 3
    show_status
}

# 모니터링 시스템 중지 함수
stop_monitoring() {
    log_info "O4O Platform 모니터링 시스템 중지 중..."
    
    npx pm2 stop o4o-performance-monitor 2>/dev/null || true
    npx pm2 stop o4o-notification-system 2>/dev/null || true
    npx pm2 stop o4o-monitoring-dashboard 2>/dev/null || true
    
    log_success "모니터링 시스템이 중지되었습니다"
}

# 모니터링 시스템 재시작 함수
restart_monitoring() {
    log_info "O4O Platform 모니터링 시스템 재시작 중..."
    
    stop_monitoring
    sleep 2
    start_monitoring
}

# 상태 확인 함수
show_status() {
    log_info "모니터링 시스템 상태:"
    echo
    
    # PM2 프로세스 상태
    npx pm2 list | grep -E "(o4o-performance-monitor|o4o-notification-system|o4o-monitoring-dashboard)" || {
        log_warning "모니터링 프로세스를 찾을 수 없습니다"
    }
    
    echo
    log_info "서비스 엔드포인트:"
    echo "  📊 모니터링 대시보드: http://localhost:3003"
    echo "  📈 성능 메트릭 API: http://localhost:3005"
    echo "  🎣 배포 웹훅: http://localhost:3004/webhook/deployment"
    
    echo
    log_info "헬스체크 수행 중..."
    
    # 대시보드 헬스체크
    if curl -f -s http://localhost:3003/api/health > /dev/null 2>&1; then
        log_success "모니터링 대시보드: 정상 작동"
    else
        log_error "모니터링 대시보드: 응답 없음"
    fi
    
    # 성능 API 헬스체크
    if curl -f -s http://localhost:3005/health > /dev/null 2>&1; then
        log_success "성능 모니터: 정상 작동"
    else
        log_error "성능 모니터: 응답 없음"
    fi
    
    # 알림 웹훅 헬스체크
    if curl -f -s http://localhost:3004/webhook/deployment > /dev/null 2>&1; then
        log_success "배포 웹훅: 정상 작동"
    else
        log_warning "배포 웹훅: 응답 없음 (정상적인 POST 요청 대기 상태)"
    fi
}

# 로그 확인 함수
show_logs() {
    local service=${1:-"all"}
    
    case $service in
        "performance"|"perf")
            log_info "성능 모니터 로그:"
            npx pm2 logs o4o-performance-monitor --lines 20
            ;;
        "notification"|"notif")
            log_info "알림 시스템 로그:"
            npx pm2 logs o4o-notification-system --lines 20
            ;;
        "dashboard"|"dash")
            log_info "모니터링 대시보드 로그:"
            npx pm2 logs o4o-monitoring-dashboard --lines 20
            ;;
        "all"|*)
            log_info "모든 모니터링 서비스 로그:"
            npx pm2 logs | grep -E "(o4o-performance-monitor|o4o-notification-system|o4o-monitoring-dashboard)" | tail -50
            ;;
    esac
}

# 사용법 표시
show_usage() {
    echo "사용법: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  start      - 모니터링 시스템 시작"
    echo "  stop       - 모니터링 시스템 중지"
    echo "  restart    - 모니터링 시스템 재시작"
    echo "  status     - 모니터링 시스템 상태 확인"
    echo "  logs       - 모니터링 시스템 로그 확인"
    echo "  logs [service] - 특정 서비스 로그 확인 (performance|notification|dashboard)"
    echo "  test       - 전체 모니터링 파이프라인 테스트"
    echo
    echo "Examples:"
    echo "  $0 start                    # 모니터링 시스템 시작"
    echo "  $0 logs performance         # 성능 모니터 로그만 확인"
    echo "  $0 test                     # 전체 테스트 실행"
}

# 테스트 함수
run_tests() {
    log_info "모니터링 파이프라인 전체 테스트 시작..."
    
    # 1. 서비스 상태 확인
    log_info "1. 서비스 상태 확인 중..."
    show_status
    
    echo
    # 2. API 엔드포인트 테스트
    log_info "2. API 엔드포인트 테스트 중..."
    
    # 대시보드 API 테스트
    if curl -f -s http://localhost:3003/api/dashboard > /dev/null; then
        log_success "대시보드 API: 정상"
    else
        log_error "대시보드 API: 실패"
    fi
    
    # 성능 메트릭 API 테스트
    if curl -f -s http://localhost:3005/metrics > /dev/null; then
        log_success "성능 메트릭 API: 정상"
    else
        log_error "성능 메트릭 API: 실패"
    fi
    
    echo
    # 3. 로그 파일 확인
    log_info "3. 로그 파일 확인 중..."
    
    local log_dir="$PROJECT_ROOT/logs"
    if [ -d "$log_dir" ]; then
        log_success "로그 디렉토리 존재: $log_dir"
        
        if [ -f "$log_dir/notifications.log" ]; then
            log_success "알림 로그 파일 존재"
        else
            log_warning "알림 로그 파일 없음"
        fi
        
        if [ -f "$log_dir/performance/current-metrics.json" ]; then
            log_success "성능 메트릭 파일 존재"
        else
            log_warning "성능 메트릭 파일 없음"
        fi
    else
        log_error "로그 디렉토리 없음: $log_dir"
    fi
    
    echo
    # 4. 테스트 알림 전송
    log_info "4. 테스트 알림 전송 중..."
    
    # 테스트 웹훅 전송
    curl -s -X POST http://localhost:3004/webhook/deployment \
        -H "Content-Type: application/json" \
        -d '{
            "status": "success",
            "app": "o4o-test",
            "commit": "test123456",
            "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
            "message": "모니터링 시스템 테스트"
        }' > /dev/null && {
        log_success "테스트 웹훅 전송 완료"
    } || {
        log_error "테스트 웹훅 전송 실패"
    }
    
    echo
    log_success "모니터링 파이프라인 테스트 완료!"
    
    echo
    log_info "대시보드 확인: http://localhost:3003"
}

# 메인 실행 로직
case "${1:-start}" in
    "start")
        start_monitoring
        ;;
    "stop")
        stop_monitoring
        ;;
    "restart")
        restart_monitoring
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "test")
        run_tests
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        log_error "알 수 없는 명령어: $1"
        show_usage
        exit 1
        ;;
esac