#!/bin/bash

# O4O Platform - 헬스체크 모니터링 스크립트
# 모든 서비스의 상태를 주기적으로 확인하고 알림 발송

set -e

# 색상 및 로그 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
HEALTH_CHECK_KEY="${HEALTH_CHECK_KEY:-}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-admin@neture.co.kr}"
LOG_FILE="/var/log/o4o-health-monitor.log"
ALERT_THRESHOLD=3 # 연속 실패 횟수
ALERT_FILE="/tmp/o4o-alert-status"

# 서비스 정보
declare -A SERVICES=(
    ["api-server"]="https://api.neture.co.kr/health"
    ["main-site"]="https://neture.co.kr/health.html"
    ["admin-dashboard"]="https://admin.neture.co.kr/health.html"
)

# 로그 함수
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp] $message${NC}"
    echo "[$timestamp] $message" >> "$LOG_FILE" 2>/dev/null || true
}

warn() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] WARNING: $message${NC}"
    echo "[$timestamp] WARNING: $message" >> "$LOG_FILE" 2>/dev/null || true
}

error() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ERROR: $message${NC}"
    echo "[$timestamp] ERROR: $message" >> "$LOG_FILE" 2>/dev/null || true
}

# 헬스체크 함수
check_service_health() {
    local service_name="$1"
    local service_url="$2"
    local start_time=$(date +%s%3N)
    
    # 헤더 설정
    local curl_headers=()
    if [[ -n "$HEALTH_CHECK_KEY" && "$service_url" == *"/health"* ]]; then
        curl_headers+=("-H" "X-Health-Check-Key: $HEALTH_CHECK_KEY")
    fi
    
    # HTTP 상태 코드와 응답 시간 측정
    local response=$(curl -s -w "%{http_code}|%{time_total}" \
        --max-time 10 \
        --connect-timeout 5 \
        "${curl_headers[@]}" \
        "$service_url" 2>/dev/null || echo "000|0")
    
    local http_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    local response_time=$(echo "$response" | tail -1 | cut -d'|' -f2)
    local end_time=$(date +%s%3N)
    local total_time=$((end_time - start_time))
    
    # 상태 판정
    if [[ "$http_code" == "200" ]]; then
        log "✅ $service_name: 정상 (HTTP $http_code, ${response_time}s)"
        return 0
    elif [[ "$http_code" =~ ^[45][0-9][0-9]$ ]]; then
        warn "⚠️  $service_name: HTTP 오류 (HTTP $http_code, ${response_time}s)"
        return 1
    else
        error "❌ $service_name: 연결 실패 (HTTP $http_code, ${total_time}ms)"
        return 2
    fi
}

# 상세 API 헬스체크
check_api_detailed() {
    log "API 서버 상세 헬스체크 실행 중..."
    
    local api_endpoints=(
        "/health"
        "/health/detailed"
        "/health/database"
        "/health/ready"
        "/health/live"
    )
    
    local failed_endpoints=0
    local total_endpoints=${#api_endpoints[@]}
    
    for endpoint in "${api_endpoints[@]}"; do
        local url="https://api.neture.co.kr$endpoint"
        local headers=()
        
        if [[ -n "$HEALTH_CHECK_KEY" ]]; then
            headers+=("-H" "X-Health-Check-Key: $HEALTH_CHECK_KEY")
        fi
        
        local response=$(curl -s -w "%{http_code}" \
            --max-time 5 \
            "${headers[@]}" \
            "$url" 2>/dev/null || echo "000")
        
        local http_code=$(echo "$response" | tail -1)
        
        if [[ "$http_code" == "200" ]]; then
            log "  ✅ $endpoint: 정상"
        else
            warn "  ❌ $endpoint: 실패 (HTTP $http_code)"
            ((failed_endpoints++))
        fi
    done
    
    if [[ $failed_endpoints -eq 0 ]]; then
        log "API 서버 상세 헬스체크: 모든 엔드포인트 정상"
        return 0
    elif [[ $failed_endpoints -lt $((total_endpoints / 2)) ]]; then
        warn "API 서버 상세 헬스체크: 일부 엔드포인트 실패 ($failed_endpoints/$total_endpoints)"
        return 1
    else
        error "API 서버 상세 헬스체크: 다수 엔드포인트 실패 ($failed_endpoints/$total_endpoints)"
        return 2
    fi
}

# 알림 관리
manage_alerts() {
    local service="$1"
    local status="$2" # 0=정상, 1=경고, 2=실패
    
    # 알림 상태 파일 생성
    touch "$ALERT_FILE"
    
    # 현재 실패 횟수 읽기
    local current_failures=$(grep "^$service:" "$ALERT_FILE" 2>/dev/null | cut -d':' -f2 || echo "0")
    
    if [[ $status -eq 0 ]]; then
        # 정상이면 실패 횟수 초기화
        sed -i "/^$service:/d" "$ALERT_FILE" 2>/dev/null || true
        
        # 복구 알림 (이전에 실패가 있었다면)
        if [[ $current_failures -gt 0 ]]; then
            send_notification "$service" "RECOVERED" "서비스가 정상으로 복구되었습니다."
        fi
    else
        # 실패 횟수 증가
        local new_failures=$((current_failures + 1))
        sed -i "/^$service:/d" "$ALERT_FILE" 2>/dev/null || true
        echo "$service:$new_failures" >> "$ALERT_FILE"
        
        # 임계값 도달 시 알림
        if [[ $new_failures -eq $ALERT_THRESHOLD ]]; then
            local alert_type="WARNING"
            if [[ $status -eq 2 ]]; then
                alert_type="CRITICAL"
            fi
            
            send_notification "$service" "$alert_type" \
                "$new_failures번 연속 실패. 즉시 확인이 필요합니다."
        fi
    fi
}

# 알림 발송
send_notification() {
    local service="$1"
    local level="$2"
    local message="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local subject="[O4O Platform] $level: $service"
    local body="
시간: $timestamp
서비스: $service
상태: $level
메시지: $message

자세한 정보는 로그를 확인하세요: $LOG_FILE
"
    
    log "알림 발송: $subject"
    
    # 이메일 발송 (mail 명령어가 설치되어 있는 경우)
    if command -v mail >/dev/null 2>&1; then
        echo "$body" | mail -s "$subject" "$NOTIFICATION_EMAIL" 2>/dev/null || \
            warn "이메일 발송 실패"
    fi
    
    # Slack 웹훅 (설정되어 있는 경우)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local slack_payload="{
            \"text\": \"$subject\",
            \"attachments\": [{
                \"color\": \"$([ "$level" = "CRITICAL" ] && echo "danger" || echo "warning")\",
                \"fields\": [{
                    \"title\": \"서비스\",
                    \"value\": \"$service\",
                    \"short\": true
                }, {
                    \"title\": \"상태\",
                    \"value\": \"$level\",
                    \"short\": true
                }, {
                    \"title\": \"메시지\",
                    \"value\": \"$message\",
                    \"short\": false
                }]
            }]
        }"
        
        curl -s -X POST \
            -H "Content-type: application/json" \
            --data "$slack_payload" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || \
            warn "Slack 알림 발송 실패"
    fi
}

# 시스템 리소스 확인
check_system_resources() {
    log "시스템 리소스 확인 중..."
    
    # 메모리 사용량
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        warn "높은 메모리 사용량: ${mem_usage}%"
    else
        log "메모리 사용량: ${mem_usage}%"
    fi
    
    # 디스크 사용량
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        warn "높은 디스크 사용량: ${disk_usage}%"
    else
        log "디스크 사용량: ${disk_usage}%"
    fi
    
    # CPU 로드 평균
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_count=$(nproc)
    if (( $(echo "$load_avg > $cpu_count" | bc -l) )); then
        warn "높은 CPU 로드: $load_avg (CPU 코어: $cpu_count)"
    else
        log "CPU 로드 평균: $load_avg"
    fi
}

# PM2 프로세스 상태 확인
check_pm2_processes() {
    if ! command -v pm2 >/dev/null 2>&1; then
        warn "PM2가 설치되지 않음"
        return
    fi
    
    log "PM2 프로세스 상태 확인 중..."
    
    local pm2_apps=("o4o-api-server" "o4o-main-site" "o4o-admin-dashboard")
    
    for app in "${pm2_apps[@]}"; do
        local status=$(pm2 jlist | jq -r ".[] | select(.name==\"$app\") | .pm2_env.status" 2>/dev/null || echo "not_found")
        
        case "$status" in
            "online")
                log "  ✅ $app: 온라인"
                ;;
            "stopped")
                warn "  ⚠️  $app: 중지됨"
                ;;
            "errored")
                error "  ❌ $app: 오류 상태"
                ;;
            "not_found")
                warn "  ❓ $app: 프로세스를 찾을 수 없음"
                ;;
            *)
                warn "  ❓ $app: 알 수 없는 상태 ($status)"
                ;;
        esac
    done
}

# 메인 헬스체크 실행
main_health_check() {
    log "=== O4O Platform 헬스체크 시작 ==="
    
    local overall_status=0
    
    # 1. 각 서비스 헬스체크
    for service in "${!SERVICES[@]}"; do
        local url="${SERVICES[$service]}"
        
        if check_service_health "$service" "$url"; then
            manage_alerts "$service" 0
        else
            local exit_code=$?
            manage_alerts "$service" $exit_code
            overall_status=1
        fi
    done
    
    # 2. API 서버 상세 헬스체크
    if check_api_detailed; then
        manage_alerts "api-detailed" 0
    else
        local exit_code=$?
        manage_alerts "api-detailed" $exit_code
        overall_status=1
    fi
    
    # 3. 시스템 리소스 확인
    check_system_resources
    
    # 4. PM2 프로세스 확인
    check_pm2_processes
    
    # 5. 결과 요약
    if [[ $overall_status -eq 0 ]]; then
        log "=== 헬스체크 완료: 모든 서비스 정상 ==="
    else
        warn "=== 헬스체크 완료: 일부 서비스에 문제 있음 ==="
    fi
    
    return $overall_status
}

# 헬프 메시지
show_help() {
    echo "O4O Platform Health Check Monitor"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  -c, --continuous    연속 모니터링 모드 (5분 간격)"
    echo "  -o, --once         한 번만 실행"
    echo "  -v, --verbose      상세 로그 출력"
    echo "  -h, --help         이 도움말 표시"
    echo ""
    echo "환경 변수:"
    echo "  HEALTH_CHECK_KEY      API 헬스체크 인증 키"
    echo "  NOTIFICATION_EMAIL    알림 받을 이메일 주소"
    echo "  SLACK_WEBHOOK_URL     Slack 알림 웹훅 URL"
    echo ""
    echo "예시:"
    echo "  $0 --once                     # 한 번만 실행"
    echo "  $0 --continuous               # 연속 모니터링"
    echo "  HEALTH_CHECK_KEY=secret $0    # 인증 키와 함께 실행"
}

# 메인 실행 로직
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -o|--once)
        main_health_check
        exit $?
        ;;
    -c|--continuous)
        log "연속 모니터링 모드 시작 (5분 간격)"
        while true; do
            main_health_check
            log "다음 체크까지 5분 대기..."
            sleep 300
        done
        ;;
    "")
        # 기본값: 한 번 실행
        main_health_check
        exit $?
        ;;
    *)
        echo "알 수 없는 옵션: $1"
        echo "사용법: $0 [-h|--help] [-o|--once] [-c|--continuous]"
        exit 1
        ;;
esac