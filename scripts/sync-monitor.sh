#!/bin/bash
# sync-monitor.sh
# O4O 플랫폼 동기화 상태 모니터링 스크립트 (실운영 최적화)
# 최종 업데이트: 2025-06-19
# 실제 서버 환경 맞춤 최적화

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 설정 변수
MONITOR_INTERVAL=${MONITOR_INTERVAL:-300}  # 5분마다 점검 (초)
LOG_DIR="logs/monitor"
ALERT_THRESHOLD=${ALERT_THRESHOLD:-3}     # 연속 실패 3회 시 알림
HISTORY_DAYS=${HISTORY_DAYS:-7}          # 7일간 이력 보관
MAX_LOG_SIZE=${MAX_LOG_SIZE:-10485760}    # 10MB

# 파일 경로
MONITOR_LOG="$LOG_DIR/monitor_$(date +%Y%m%d).log"
ALERT_LOG="$LOG_DIR/alerts.log"
STATUS_FILE="$LOG_DIR/last_status.json"
PID_FILE="$LOG_DIR/monitor.pid"
CONSECUTIVE_FAILURES_FILE="$LOG_DIR/consecutive_failures"

# 로그 함수들
log_with_timestamp() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 로그 크기 제한
    if [ -f "$MONITOR_LOG" ] && [ $(stat -f%z "$MONITOR_LOG" 2>/dev/null || stat -c%s "$MONITOR_LOG" 2>/dev/null || echo 0) -gt $MAX_LOG_SIZE ]; then
        mv "$MONITOR_LOG" "${MONITOR_LOG}.old"
        echo "[$timestamp] [INFO] 로그 파일 순환: $MONITOR_LOG" > "$MONITOR_LOG"
    fi
    
    echo "[$timestamp] [$level] $message" | tee -a "$MONITOR_LOG"
}

log_info() {
    log_with_timestamp "INFO" "$1"
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    log_with_timestamp "SUCCESS" "$1"
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    log_with_timestamp "WARNING" "$1"
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    log_with_timestamp "ERROR" "$1"
    echo -e "${RED}❌ $1${NC}"
}

log_alert() {
    local message=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] ALERT: $message" | tee -a "$ALERT_LOG"
    echo -e "${RED}🚨 ALERT: $message${NC}"
}

# 디렉터리 초기화
initialize_directories() {
    mkdir -p "$LOG_DIR"
    
    # 로그 파일들 초기화
    if [ ! -f "$MONITOR_LOG" ]; then
        echo "# O4O 플랫폼 동기화 모니터링 로그 - $(date)" > "$MONITOR_LOG"
    fi
    
    if [ ! -f "$ALERT_LOG" ]; then
        echo "# O4O 플랫폼 알림 로그 - $(date)" > "$ALERT_LOG"
    fi
    
    # 연속 실패 카운터 초기화
    if [ ! -f "$CONSECUTIVE_FAILURES_FILE" ]; then
        echo "0" > "$CONSECUTIVE_FAILURES_FILE"
    fi
}

# 서버 타입 감지
detect_server_type() {
    local hostname=$(hostname)
    local server_type="unknown"
    
    # 호스트명 기반 감지
    if [[ $hostname == *"webserver"* ]] || [[ $hostname == *"web"* ]]; then
        server_type="webserver"
    elif [[ $hostname == *"api"* ]] || [[ $hostname == *"backend"* ]]; then
        server_type="apiserver"
    else
        # 현재 구조 기반 감지
        if [ -d "services/main-site" ] && [ ! -d "services/api-server" ]; then
            server_type="webserver"
        elif [ -d "services/api-server" ] && [ ! -d "services/main-site" ]; then
            server_type="apiserver"
        elif [ -d "services/main-site" ] && [ -d "services/api-server" ]; then
            server_type="development"
        fi
    fi
    
    echo "$server_type"
}

# 시스템 상태 수집
collect_system_status() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local server_type=$(detect_server_type)
    
    # Git 상태
    local git_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    local git_changes=$(git status --porcelain 2>/dev/null | wc -l)
    local git_files=$(git ls-files 2>/dev/null | wc -l)
    local sparse_enabled=$(git config core.sparseCheckout 2>/dev/null || echo "false")
    local cone_mode=$(git config core.sparseCheckoutCone 2>/dev/null || echo "false")
    
    # Git 버전
    local git_version=$(git --version | cut -d' ' -f3)
    
    # Sparse checkout 작동 상태
    local sparse_working="unknown"
    if [ "$sparse_enabled" = "true" ]; then
        if git status | grep -q "sparse checkout"; then
            sparse_working="true"
            local sparse_percentage=$(git status | grep "sparse checkout" | grep -o '[0-9]\+%' | head -1 || echo "unknown")
        else
            sparse_working="false"
            sparse_percentage="unknown"
        fi
    else
        sparse_working="disabled"
        sparse_percentage="100%"
    fi
    
    # 디렉터리 상태
    local services_exists=$([ -d "services" ] && echo "true" || echo "false")
    local services_count=$([ -d "services" ] && ls services/ 2>/dev/null | wc -l || echo "0")
    local services_list=""
    if [ "$services_exists" = "true" ] && [ "$services_count" -gt 0 ]; then
        services_list=$(ls services/ 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    fi
    
    # 스크립트 상태
    local scripts_exists=$([ -d "scripts" ] && echo "true" || echo "false")
    local scripts_count=$([ -d "scripts" ] && ls scripts/*.sh 2>/dev/null | wc -l || echo "0")
    
    # 파일시스템 상태
    local disk_usage=$(df . 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    local dir_size=$(du -sh . 2>/dev/null | cut -f1 || echo "unknown")
    
    # 네트워크 상태
    local github_reachable=$(timeout 5 ping -c 1 github.com > /dev/null 2>&1 && echo "true" || echo "false")
    local remote_reachable=$(timeout 10 git ls-remote origin > /dev/null 2>&1 && echo "true" || echo "false")
    
    # 시스템 부하 (간단한 측정)
    local load_avg=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{ print $1 }' | sed 's/,//' || echo "unknown")
    
    # JSON 생성
    cat << EOF
{
  "timestamp": "$timestamp",
  "server_type": "$server_type",
  "git": {
    "version": "$git_version",
    "branch": "$git_branch",
    "changes": $git_changes,
    "files": $git_files,
    "sparse_enabled": "$sparse_enabled",
    "cone_mode": "$cone_mode",
    "sparse_working": "$sparse_working",
    "sparse_percentage": "$sparse_percentage"
  },
  "directories": {
    "services_exists": $services_exists,
    "services_count": $services_count,
    "services_list": "$services_list",
    "scripts_exists": $scripts_exists,
    "scripts_count": $scripts_count
  },
  "filesystem": {
    "disk_usage": $disk_usage,
    "directory_size": "$dir_size"
  },
  "network": {
    "github_reachable": $github_reachable,
    "remote_reachable": $remote_reachable
  },
  "system": {
    "load_average": "$load_avg",
    "hostname": "$(hostname)"
  }
}
EOF
}

# 상태 분석 및 문제 감지
analyze_status() {
    local current_status=$1
    local issues=()
    local server_type=$(echo "$current_status" | jq -r '.server_type')
    
    # Sparse checkout 관련 문제
    local sparse_enabled=$(echo "$current_status" | jq -r '.git.sparse_enabled')
    local sparse_working=$(echo "$current_status" | jq -r '.git.sparse_working')
    local git_files=$(echo "$current_status" | jq -r '.git.files')
    
    if [ "$sparse_enabled" = "true" ] && [ "$sparse_working" = "false" ]; then
        issues+=("sparse_checkout_not_working")
    fi
    
    if [ "$sparse_enabled" = "true" ] && [ "$git_files" -gt 300 ]; then
        issues+=("too_many_files_tracked:$git_files")
    fi
    
    # Git 관련 문제
    local git_changes=$(echo "$current_status" | jq -r '.git.changes')
    if [ "$git_changes" -gt 20 ]; then
        issues+=("many_uncommitted_changes:$git_changes")
    fi
    
    # 서버별 디렉터리 문제
    local services_list=$(echo "$current_status" | jq -r '.directories.services_list')
    
    case $server_type in
        "webserver")
            if [[ "$services_list" == *"api-server"* ]]; then
                issues+=("wrong_service_webserver:api-server")
            fi
            if [[ "$services_list" != *"main-site"* ]]; then
                issues+=("missing_main_site")
            fi
            ;;
        "apiserver")
            if [[ "$services_list" == *"main-site"* ]]; then
                issues+=("wrong_service_apiserver:main-site")
            fi
            if [[ "$services_list" != *"api-server"* ]]; then
                issues+=("missing_api_server")
            fi
            ;;
    esac
    
    # 파일시스템 문제
    local disk_usage=$(echo "$current_status" | jq -r '.filesystem.disk_usage')
    if [ "$disk_usage" -gt 90 ]; then
        issues+=("disk_critical:$disk_usage")
    elif [ "$disk_usage" -gt 80 ]; then
        issues+=("disk_warning:$disk_usage")
    fi
    
    # 네트워크 문제
    local github_reachable=$(echo "$current_status" | jq -r '.network.github_reachable')
    local remote_reachable=$(echo "$current_status" | jq -r '.network.remote_reachable')
    
    if [ "$github_reachable" = "false" ]; then
        issues+=("github_unreachable")
    fi
    
    if [ "$remote_reachable" = "false" ]; then
        issues+=("remote_unreachable")
    fi
    
    # 스크립트 문제
    local scripts_count=$(echo "$current_status" | jq -r '.directories.scripts_count')
    if [ "$scripts_count" -lt 3 ]; then
        issues+=("missing_scripts:$scripts_count")
    fi
    
    echo "${issues[@]}"
}

# 이전 상태와 비교
compare_with_previous() {
    local current_status=$1
    
    if [ ! -f "$STATUS_FILE" ]; then
        echo "$current_status" > "$STATUS_FILE"
        return 0
    fi
    
    local previous_status=$(cat "$STATUS_FILE")
    local changes=()
    
    # 서버 타입 변화
    local prev_type=$(echo "$previous_status" | jq -r '.server_type')
    local curr_type=$(echo "$current_status" | jq -r '.server_type')
    if [ "$prev_type" != "$curr_type" ]; then
        changes+=("server_type:$prev_type->$curr_type")
    fi
    
    # 파일 수 변화 (10개 이상 차이)
    local prev_files=$(echo "$previous_status" | jq -r '.git.files')
    local curr_files=$(echo "$current_status" | jq -r '.git.files')
    local file_diff=$((curr_files - prev_files))
    if [ ${file_diff#-} -gt 10 ]; then  # 절댓값 비교
        changes+=("files:$prev_files->$curr_files")
    fi
    
    # Sparse checkout 상태 변화
    local prev_sparse=$(echo "$previous_status" | jq -r '.git.sparse_working')
    local curr_sparse=$(echo "$current_status" | jq -r '.git.sparse_working')
    if [ "$prev_sparse" != "$curr_sparse" ]; then
        changes+=("sparse_working:$prev_sparse->$curr_sparse")
    fi
    
    # 서비스 수 변화
    local prev_services=$(echo "$previous_status" | jq -r '.directories.services_count')
    local curr_services=$(echo "$current_status" | jq -r '.directories.services_count')
    if [ "$prev_services" != "$curr_services" ]; then
        changes+=("services:$prev_services->$curr_services")
    fi
    
    # 디스크 사용량 변화 (5% 이상)
    local prev_disk=$(echo "$previous_status" | jq -r '.filesystem.disk_usage')
    local curr_disk=$(echo "$current_status" | jq -r '.filesystem.disk_usage')
    local disk_diff=$((curr_disk - prev_disk))
    if [ ${disk_diff#-} -gt 5 ]; then  # 절댓값 비교
        changes+=("disk:$prev_disk%->$curr_disk%")
    fi
    
    # 현재 상태 저장
    echo "$current_status" > "$STATUS_FILE"
    
    echo "${changes[@]}"
}

# 알림 전송
send_alert() {
    local alert_type=$1
    local message=$2
    local severity=${3:-"warning"}
    
    log_alert "$alert_type: $message"
    
    # Slack 웹훅 (설정된 경우)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="warning"
        local emoji="⚠️"
        case $severity in
            "critical") 
                color="danger"
                emoji="🚨"
                ;;
            "warning") 
                color="warning"
                emoji="⚠️"
                ;;
            "info") 
                color="good"
                emoji="ℹ️"
                ;;
        esac
        
        local hostname=$(hostname)
        local server_type=$(detect_server_type)
        
        local payload=$(cat << EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "$emoji O4O 플랫폼 알림",
      "fields": [
        {
          "title": "서버",
          "value": "$hostname ($server_type)",
          "short": true
        },
        {
          "title": "알림 유형",
          "value": "$alert_type",
          "short": true
        },
        {
          "title": "메시지",
          "value": "$message",
          "short": false
        }
      ],
      "footer": "동기화 모니터",
      "ts": $(date +%s)
    }
  ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # 이메일 알림 (mailutils 설치된 경우)
    if command -v mail > /dev/null 2>&1 && [ -n "${ALERT_EMAIL:-}" ]; then
        local subject="O4O 플랫폼 알림: $alert_type"
        local body="서버: $(hostname) ($(detect_server_type))
시간: $(date)
유형: $alert_type
메시지: $message

자세한 정보는 로그를 확인하세요: $MONITOR_LOG"
        
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # 로컬 알림 (데스크톱 환경)
    if [ -n "${DISPLAY:-}" ]; then
        if command -v notify-send > /dev/null 2>&1; then
            notify-send "O4O 플랫폼" "$alert_type: $message" 2>/dev/null || true
        fi
    fi
}

# 자동 복구 시도
attempt_auto_recovery() {
    local issues=($1)
    
    log_info "자동 복구 시도 중..."
    
    local recovery_attempted=false
    
    for issue in "${issues[@]}"; do
        case $issue in
            "sparse_checkout_not_working"|"too_many_files_tracked"*|"missing_main_site"|"missing_api_server"|"wrong_service"*)
                if [ -f scripts/auto-recovery.sh ] && [ "$recovery_attempted" = false ]; then
                    log_info "auto-recovery.sh 실행 중..."
                    if timeout 300 ./scripts/auto-recovery.sh --force 2>/dev/null; then
                        log_success "자동 복구 성공: $issue"
                        send_alert "자동 복구 성공" "문제 '$issue' 해결됨" "info"
                        recovery_attempted=true
                    else
                        log_error "자동 복구 실패: $issue"
                        send_alert "자동 복구 실패" "문제 '$issue' 해결 실패" "critical"
                    fi
                fi
                ;;
            "disk_critical"*)
                log_info "디스크 정리 시도 중..."
                # 안전한 정리만 수행
                git gc --auto 2>/dev/null || true
                find . -name "*.tmp" -o -name "*.temp" -type f -mtime +1 -delete 2>/dev/null || true
                log_success "디스크 정리 완료"
                ;;
            "many_uncommitted_changes"*)
                log_warning "많은 미커밋 변경사항 감지 - 수동 확인 필요"
                ;;
        esac
    done
}

# 연속 실패 관리
manage_consecutive_failures() {
    local has_critical_issues=$1
    local consecutive_failures=$(cat "$CONSECUTIVE_FAILURES_FILE")
    
    if [ "$has_critical_issues" = "true" ]; then
        consecutive_failures=$((consecutive_failures + 1))
        echo "$consecutive_failures" > "$CONSECUTIVE_FAILURES_FILE"
        
        if [ "$consecutive_failures" -ge "$ALERT_THRESHOLD" ]; then
            send_alert "연속 실패" "${consecutive_failures}회 연속 중요 문제 감지" "critical"
            echo "0" > "$CONSECUTIVE_FAILURES_FILE"  # 알림 후 카운터 리셋
        fi
    else
        if [ "$consecutive_failures" -gt 0 ]; then
            log_success "문제 해결됨 (연속 실패 카운터 리셋)"
            echo "0" > "$CONSECUTIVE_FAILURES_FILE"
        fi
    fi
}

# 상태 보고서 생성
generate_status_report() {
    local report_file="$LOG_DIR/status_report_$(date +%Y%m%d_%H%M%S).md"
    local current_status=$(collect_system_status)
    
    cat > "$report_file" << EOF
# 📊 O4O 플랫폼 상태 보고서

**생성 시간**: $(date '+%Y-%m-%d %H:%M:%S')
**서버**: $(hostname) ($(detect_server_type))

## 🔍 현재 시스템 상태

### Git 상태
- **브랜치**: $(echo "$current_status" | jq -r '.git.branch')
- **Git 버전**: $(echo "$current_status" | jq -r '.git.version')
- **변경사항**: $(echo "$current_status" | jq -r '.git.changes')개
- **추적된 파일**: $(echo "$current_status" | jq -r '.git.files')개
- **Sparse checkout**: $(echo "$current_status" | jq -r '.git.sparse_enabled')
- **Cone mode**: $(echo "$current_status" | jq -r '.git.cone_mode')
- **Sparse 작동**: $(echo "$current_status" | jq -r '.git.sparse_working')
- **동기화 비율**: $(echo "$current_status" | jq -r '.git.sparse_percentage')

### 디렉터리 상태
- **Services 폴더**: $(echo "$current_status" | jq -r '.directories.services_exists')
- **Services 목록**: $(echo "$current_status" | jq -r '.directories.services_list')
- **Scripts 개수**: $(echo "$current_status" | jq -r '.directories.scripts_count')개

### 파일시스템
- **디스크 사용량**: $(echo "$current_status" | jq -r '.filesystem.disk_usage')%
- **디렉터리 크기**: $(echo "$current_status" | jq -r '.filesystem.directory_size')

### 네트워크
- **GitHub 연결**: $(echo "$current_status" | jq -r '.network.github_reachable')
- **원격 저장소 연결**: $(echo "$current_status" | jq -r '.network.remote_reachable')

### 시스템
- **부하 평균**: $(echo "$current_status" | jq -r '.system.load_average')
- **호스트명**: $(echo "$current_status" | jq -r '.system.hostname')

## 📈 최근 알림 (최근 24시간)

EOF

    # 최근 24시간 알림 추가
    if [ -f "$ALERT_LOG" ]; then
        local today=$(date '+%Y-%m-%d')
        local yesterday=$(date -d '1 day ago' '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null || echo "")
        
        if grep -E "$today|$yesterday" "$ALERT_LOG" 2>/dev/null | tail -20 | sed 's/^/- /' >> "$report_file"; then
            true
        else
            echo "- 최근 알림 없음" >> "$report_file"
        fi
    fi
    
    cat >> "$report_file" << EOF

## 🔧 권장 조치

### 정기 점검
- \`./scripts/health-check.sh\` 실행
- 디스크 사용량 모니터링
- Git 상태 확인

### 문제 발생 시
- \`./scripts/auto-recovery.sh --force\` 실행
- 로그 확인: \`$MONITOR_LOG\`
- 팀에 알림: Slack #dev-support

---
*자동 생성된 상태 보고서*
EOF

    echo "$report_file"
}

# 로그 정리
cleanup_logs() {
    log_info "오래된 로그 정리 중..."
    
    # 오래된 모니터링 로그 제거
    find "$LOG_DIR" -name "monitor_*.log" -mtime +$HISTORY_DAYS -delete 2>/dev/null || true
    find "$LOG_DIR" -name "monitor_*.log.old" -mtime +1 -delete 2>/dev/null || true
    
    # 오래된 상태 보고서 제거
    find "$LOG_DIR" -name "status_report_*.md" -mtime +$HISTORY_DAYS -delete 2>/dev/null || true
    
    # 알림 로그는 1000줄로 제한
    if [ -f "$ALERT_LOG" ] && [ $(wc -l < "$ALERT_LOG") -gt 1000 ]; then
        tail -1000 "$ALERT_LOG" > "$ALERT_LOG.tmp"
        mv "$ALERT_LOG.tmp" "$ALERT_LOG"
    fi
    
    log_success "로그 정리 완료"
}

# 단일 점검 실행
run_single_check() {
    local current_status=$(collect_system_status)
    local issues=($(analyze_status "$current_status"))
    local changes=($(compare_with_previous "$current_status"))
    
    # 변화 로깅
    if [ ${#changes[@]} -gt 0 ]; then
        log_info "상태 변화 감지: ${changes[*]}"
    fi
    
    # 심각한 문제들 확인
    local has_critical_issues=false
    local critical_issues=()
    
    # 문제 감지 및 처리
    if [ ${#issues[@]} -gt 0 ]; then
        log_warning "${#issues[@]}개 문제 감지: ${issues[*]}"
        
        # 심각한 문제들에 대해 알림
        for issue in "${issues[@]}"; do
            case $issue in
                "sparse_checkout_not_working"|"missing_main_site"|"missing_api_server"|"disk_critical"*)
                    send_alert "심각한 문제" "$issue" "critical"
                    critical_issues+=("$issue")
                    has_critical_issues=true
                    ;;
                "too_many_files_tracked"*|"wrong_service"*|"disk_warning"*|"remote_unreachable")
                    send_alert "경고" "$issue" "warning"
                    ;;
                "many_uncommitted_changes"*|"github_unreachable"|"missing_scripts"*)
                    log_warning "주의 필요: $issue"
                    ;;
            esac
        done
        
        # 자동 복구 시도 (설정된 경우)
        if [ "${AUTO_RECOVERY:-false}" = "true" ] && [ ${#critical_issues[@]} -gt 0 ]; then
            attempt_auto_recovery "${critical_issues[@]}"
        fi
    else
        log_success "모든 상태 정상"
    fi
    
    # 연속 실패 관리
    manage_consecutive_failures "$has_critical_issues"
    
    # 결과 반환
    if [ "$has_critical_issues" = "true" ]; then
        return 1
    else
        return 0
    fi
}

# 지속적 모니터링
run_continuous_monitoring() {
    log_info "지속적 모니터링 시작 (간격: ${MONITOR_INTERVAL}초)"
    log_info "서버 타입: $(detect_server_type)"
    log_info "Git 버전: $(git --version | cut -d' ' -f3)"
    
    while true; do
        local check_result=0
        
        # 점검 실행
        if ! run_single_check; then
            check_result=1
        fi
        
        # 매 시간마다 로그 정리
        local current_minute=$(date +%M)
        if [ "$current_minute" = "00" ]; then
            cleanup_logs
        fi
        
        # 매 6시간마다 상태 보고서 생성
        local current_hour=$(date +%H)
        if [ "$current_minute" = "00" ] && [ $((current_hour % 6)) -eq 0 ]; then
            local report_file=$(generate_status_report)
            log_info "정기 상태 보고서 생성: $report_file"
        fi
        
        sleep $MONITOR_INTERVAL
    done
}

# 데몬 모드 관리
start_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        log_error "모니터링이 이미 실행 중입니다 (PID: $(cat "$PID_FILE"))"
        exit 1
    fi
    
    log_info "백그라운드 모니터링 시작..."
    
    # 백그라운드에서 실행
    nohup "$0" --continuous > "$LOG_DIR/daemon.log" 2>&1 &
    local daemon_pid=$!
    echo $daemon_pid > "$PID_FILE"
    
    log_success "모니터링 데몬 시작됨 (PID: $daemon_pid)"
    log_info "로그 위치: $LOG_DIR/daemon.log"
    log_info "중지 명령: $0 --stop"
}

stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$PID_FILE"
            log_success "모니터링 데몬 중지됨 (PID: $pid)"
        else
            log_warning "데몬이 실행 중이지 않습니다"
            rm -f "$PID_FILE"
        fi
    else
        log_warning "PID 파일이 없습니다. 데몬이 실행 중이지 않을 수 있습니다"
    fi
}

# 메인 실행 함수
main() {
    # 옵션 처리
    while [[ $# -gt 0 ]]; do
        case $1 in
            --continuous)
                initialize_directories
                run_continuous_monitoring
                exit 0
                ;;
            --start)
                initialize_directories
                start_daemon
                exit 0
                ;;
            --stop)
                stop_daemon
                exit 0
                ;;
            --status)
                if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
                    echo "모니터링 데몬 실행 중 (PID: $(cat "$PID_FILE"))"
                    echo "로그: $LOG_DIR/daemon.log"
                    echo "최근 상태: $(tail -1 "$MONITOR_LOG" 2>/dev/null || echo "로그 없음")"
                else
                    echo "모니터링 데몬 중지됨"
                fi
                exit 0
                ;;
            --report)
                initialize_directories
                local report=$(generate_status_report)
                log_success "상태 보고서 생성: $report"
                cat "$report"
                exit 0
                ;;
            --cleanup)
                initialize_directories
                cleanup_logs
                exit 0
                ;;
            --help|-h)
                cat << 'EOF'
사용법: ./sync-monitor.sh [옵션]

옵션:
  --continuous    지속적 모니터링 실행 (포그라운드)
  --start         백그라운드 데몬으로 모니터링 시작
  --stop          백그라운드 데몬 중지
  --status        데몬 실행 상태 및 최근 로그 확인
  --report        현재 상태 보고서 생성 및 출력
  --cleanup       오래된 로그 파일 정리
  -h, --help      이 도움말 표시

환경 변수:
  MONITOR_INTERVAL    점검 간격 (초, 기본값: 300)
  SLACK_WEBHOOK_URL   Slack 알림 웹훅 URL
  ALERT_EMAIL         알림 이메일 주소
  AUTO_RECOVERY       자동 복구 활성화 (true/false)
  ALERT_THRESHOLD     연속 실패 알림 임계값 (기본값: 3)

예제:
  ./sync-monitor.sh           # 한 번 점검
  ./sync-monitor.sh --start   # 백그라운드 시작
  ./sync-monitor.sh --status  # 상태 확인
  ./sync-monitor.sh --report  # 상태 보고서 생성

  # 환경변수와 함께 사용
  AUTO_RECOVERY=true SLACK_WEBHOOK_URL="https://..." ./sync-monitor.sh --start
EOF
                exit 0
                ;;
            *)
                log_error "알 수 없는 옵션: $1"
                exit 1
                ;;
        esac
    done
    
    # 기본 동작: 한 번 점검
    initialize_directories
    
    echo "🔍 O4O 플랫폼 동기화 상태 점검"
    echo "================================"
    echo "서버: $(hostname) ($(detect_server_type))"
    echo "시간: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    if run_single_check; then
        echo ""
        echo "🎉 모든 상태가 정상입니다!"
        echo ""
        echo "💡 지속적 모니터링을 원하시면:"
        echo "  ./sync-monitor.sh --start"
    else
        echo ""
        echo "⚠️  문제가 감지되었습니다."
        echo "📋 자세한 정보: $MONITOR_LOG"
        echo "🔧 자동 복구: ./scripts/auto-recovery.sh --force"
        echo "📊 상태 보고서: ./sync-monitor.sh --report"
    fi
}

# 스크립트 실행
main "$@"
