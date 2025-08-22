#!/bin/bash

# PM2 모니터링 및 알림 스크립트
# 목적: PM2 프로세스 상태 모니터링 및 이상 감지 시 알림
# 작성일: 2025-08-18
# 작성자: O4O Platform Team

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 설정
MONITOR_INTERVAL=${MONITOR_INTERVAL:-60}  # 기본 60초마다 체크
LOG_FILE="${HOME}/pm2-monitor.log"
ALERT_FILE="${HOME}/pm2-alerts.log"
SERVER_TYPE="${SERVER_TYPE:-local}"

# 로그 함수
log_info() { 
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() { 
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE" "$ALERT_FILE" >&2
}

log_warning() { 
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE" "$ALERT_FILE"
}

log_alert() {
    echo -e "${MAGENTA}[ALERT]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$ALERT_FILE"
}

# 서버 타입 감지
detect_server_type() {
    if [ ! -z "$SERVER_TYPE" ]; then
        echo "$SERVER_TYPE"
    elif [[ "$(hostname)" == *"webserver"* ]]; then
        echo "webserver"
    elif [[ "$(hostname)" == *"apiserver"* ]]; then
        echo "apiserver"
    elif [ -f ".env.local" ]; then
        echo "local"
    else
        echo "unknown"
    fi
}

# 잘못된 프로세스 체크
check_wrong_processes() {
    local server_type="$1"
    local pm2_list=$(pm2 jlist 2>/dev/null || echo "[]")
    local has_issues=false
    
    case "$server_type" in
        "webserver")
            # 웹서버에서 API 프로세스 체크
            if echo "$pm2_list" | grep -q '"name":"o4o-api"'; then
                log_alert "❌ 웹서버에서 API 프로세스(o4o-api)가 실행 중입니다!"
                log_alert "   이는 잘못된 설정입니다. 즉시 확인이 필요합니다!"
                log_alert "   실행 명령: pm2 delete o4o-api"
                has_issues=true
            fi
            ;;
        "apiserver")
            # API서버에서 프론트엔드 프로세스 체크
            if echo "$pm2_list" | grep -q '"name":"o4o-admin"'; then
                log_alert "❌ API서버에서 Admin 프로세스(o4o-admin)가 실행 중입니다!"
                log_alert "   이는 잘못된 설정입니다. 즉시 확인이 필요합니다!"
                log_alert "   실행 명령: pm2 delete o4o-admin"
                has_issues=true
            fi
            if echo "$pm2_list" | grep -q '"name":"o4o-storefront"'; then
                log_alert "❌ API서버에서 Storefront 프로세스(o4o-storefront)가 실행 중입니다!"
                log_alert "   이는 잘못된 설정입니다. 즉시 확인이 필요합니다!"
                log_alert "   실행 명령: pm2 delete o4o-storefront"
                has_issues=true
            fi
            ;;
    esac
    
    echo "$has_issues"
}

# 프로세스 상태 체크
check_process_status() {
    local pm2_list=$(pm2 jlist 2>/dev/null || echo "[]")
    
    # PM2가 실행 중인지 확인
    if [ "$pm2_list" == "[]" ]; then
        log_info "PM2 프로세스가 실행 중이지 않습니다"
        return 0
    fi
    
    # 각 프로세스 상태 체크
    echo "$pm2_list" | jq -r '.[] | "\(.name):\(.pm2_env.status)"' 2>/dev/null | while IFS=':' read -r name status; do
        case "$status" in
            "online")
                log_info "✅ $name - 정상 실행 중"
                ;;
            "stopped")
                log_warning "⚠️  $name - 중지됨"
                ;;
            "errored")
                log_error "❌ $name - 오류 발생"
                ;;
            *)
                log_warning "❓ $name - 알 수 없는 상태: $status"
                ;;
        esac
    done
}

# 메모리 사용량 체크
check_memory_usage() {
    local pm2_list=$(pm2 jlist 2>/dev/null || echo "[]")
    local high_memory_threshold=1073741824  # 1GB in bytes
    
    echo "$pm2_list" | jq -r '.[] | "\(.name):\(.monit.memory)"' 2>/dev/null | while IFS=':' read -r name memory; do
        if [ "$memory" -gt "$high_memory_threshold" ]; then
            local memory_mb=$((memory / 1048576))
            log_warning "⚠️  $name - 높은 메모리 사용량: ${memory_mb}MB"
        fi
    done
}

# CPU 사용량 체크
check_cpu_usage() {
    local pm2_list=$(pm2 jlist 2>/dev/null || echo "[]")
    local high_cpu_threshold=80
    
    echo "$pm2_list" | jq -r '.[] | "\(.name):\(.monit.cpu)"' 2>/dev/null | while IFS=':' read -r name cpu; do
        if [ "$cpu" -gt "$high_cpu_threshold" ]; then
            log_warning "⚠️  $name - 높은 CPU 사용량: ${cpu}%"
        fi
    done
}

# 재시작 횟수 체크
check_restart_count() {
    local pm2_list=$(pm2 jlist 2>/dev/null || echo "[]")
    local high_restart_threshold=5
    
    echo "$pm2_list" | jq -r '.[] | "\(.name):\(.pm2_env.restart_time)"' 2>/dev/null | while IFS=':' read -r name restarts; do
        if [ "$restarts" -gt "$high_restart_threshold" ]; then
            log_warning "⚠️  $name - 과도한 재시작 횟수: $restarts"
            log_warning "   로그 확인: pm2 logs $name --lines 50"
        fi
    done
}

# 알림 요약 생성
generate_summary() {
    local server_type="$1"
    local alert_count=$(grep -c "ALERT" "$ALERT_FILE" 2>/dev/null || echo "0")
    local warning_count=$(grep -c "WARNING" "$LOG_FILE" 2>/dev/null || echo "0")
    
    echo ""
    echo "=== 모니터링 요약 ==="
    echo "서버 타입: $server_type"
    echo "체크 시간: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "알림: $alert_count건"
    echo "경고: $warning_count건"
    echo ""
    
    if [ "$alert_count" -gt 0 ]; then
        echo "최근 알림:"
        tail -5 "$ALERT_FILE" 2>/dev/null
    fi
}

# 단일 체크 실행
run_check() {
    local server_type=$(detect_server_type)
    
    log_info "=== PM2 모니터링 시작 ==="
    log_info "서버 타입: $server_type"
    
    # 잘못된 프로세스 체크
    local has_issues=$(check_wrong_processes "$server_type")
    
    # 프로세스 상태 체크
    check_process_status
    
    # 리소스 사용량 체크
    check_memory_usage
    check_cpu_usage
    
    # 재시작 횟수 체크
    check_restart_count
    
    # 요약 생성
    generate_summary "$server_type"
    
    if [ "$has_issues" == "true" ]; then
        return 1
    fi
    return 0
}

# 연속 모니터링
continuous_monitor() {
    log_info "연속 모니터링 모드 시작 (간격: ${MONITOR_INTERVAL}초)"
    log_info "중지하려면 Ctrl+C를 누르세요"
    
    while true; do
        run_check
        echo "다음 체크까지 ${MONITOR_INTERVAL}초 대기..."
        sleep "$MONITOR_INTERVAL"
    done
}

# 사용법
usage() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --once      단일 체크만 수행하고 종료"
    echo "  --continuous 연속 모니터링 (기본값)"
    echo "  --interval N N초마다 체크 (기본: 60)"
    echo "  --help      이 도움말 표시"
    echo ""
    echo "환경 변수:"
    echo "  SERVER_TYPE      서버 타입 지정 (webserver/apiserver/local)"
    echo "  MONITOR_INTERVAL 모니터링 간격 (초)"
    echo ""
    echo "예시:"
    echo "  $0 --once                    # 한 번만 체크"
    echo "  $0 --continuous --interval 30 # 30초마다 체크"
    exit 0
}

# 메인 함수
main() {
    local mode="continuous"
    
    # 인자 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            --once)
                mode="once"
                shift
                ;;
            --continuous)
                mode="continuous"
                shift
                ;;
            --interval)
                MONITOR_INTERVAL="$2"
                shift 2
                ;;
            --help|-h)
                usage
                ;;
            *)
                echo "알 수 없는 옵션: $1"
                usage
                ;;
        esac
    done
    
    # 로그 파일 초기화
    if [ ! -f "$LOG_FILE" ]; then
        touch "$LOG_FILE"
    fi
    if [ ! -f "$ALERT_FILE" ]; then
        touch "$ALERT_FILE"
    fi
    
    # 모드에 따라 실행
    case "$mode" in
        "once")
            run_check
            exit $?
            ;;
        "continuous")
            continuous_monitor
            ;;
    esac
}

# Ctrl+C 처리
trap 'echo -e "\n모니터링 중지됨"; exit 0' INT

# 스크립트 실행
main "$@"