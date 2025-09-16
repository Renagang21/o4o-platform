#!/bin/bash

# O4O Platform 배포 모니터링 스크립트
# 사용법: ./scripts/deploy-monitor.sh [action]
# 예시: ./scripts/deploy-monitor.sh status
#       ./scripts/deploy-monitor.sh logs
#       ./scripts/deploy-monitor.sh health
#       ./scripts/deploy-monitor.sh watch

set -e

# 서버 정보
WEB_HOST="13.125.144.8"
API_HOST="43.202.242.215"
USER="ubuntu"

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

log_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

log_monitor() {
    echo -e "${CYAN}📊 $1${NC}"
}

# 서비스 상태 확인
check_service_status() {
    log_header "서비스 상태 확인"
    echo ""
    
    # API 서버 상태
    log_monitor "API 서버 상태 확인 중..."
    if curl -f -s https://api.neture.co.kr/health > /dev/null 2>&1; then
        response=$(curl -s https://api.neture.co.kr/health)
        log_success "API 서버: 정상 동작"
        echo "  응답: $response"
    else
        log_error "API 서버: 접근 불가"
    fi
    
    # Admin Dashboard 상태
    log_monitor "Admin Dashboard 상태 확인 중..."
    if curl -f -s https://admin.neture.co.kr > /dev/null 2>&1; then
        log_success "Admin Dashboard: 정상 접근 가능"
    else
        log_error "Admin Dashboard: 접근 불가"
    fi
    
    # 메인 웹사이트 상태
    log_monitor "메인 웹사이트 상태 확인 중..."
    if curl -f -s https://neture.co.kr > /dev/null 2>&1; then
        log_success "메인 웹사이트: 정상 접근 가능"
    else
        log_error "메인 웹사이트: 접근 불가"
    fi
    
    # PM2 프로세스 상태
    log_monitor "PM2 프로세스 상태 확인 중..."
    ssh ${USER}@${API_HOST} "
        echo '🔍 PM2 프로세스 목록:'
        pm2 list
        echo ''
        echo '📊 PM2 프로세스 상세 정보:'
        pm2 show o4o-api-server 2>/dev/null | head -20 || echo '⚠️  프로세스를 찾을 수 없습니다'
    " 2>/dev/null || log_error "API 서버에 연결할 수 없습니다"
    
    # Nginx 상태
    log_monitor "Nginx 상태 확인 중..."
    ssh ${USER}@${WEB_HOST} "
        if sudo systemctl is-active --quiet nginx; then
            echo '✅ Nginx: 실행 중'
        else
            echo '❌ Nginx: 중지됨'
        fi
        
        echo '📊 Nginx 설정 테스트:'
        if sudo nginx -t 2>&1; then
            echo '✅ Nginx 설정: 정상'
        else
            echo '❌ Nginx 설정: 오류'
        fi
    " 2>/dev/null || log_error "웹서버에 연결할 수 없습니다"
    
    echo ""
}

# 로그 확인
check_logs() {
    local service=${1:-"all"}
    
    log_header "로그 확인 ($service)"
    echo ""
    
    case $service in
        "api"|"all")
            log_monitor "API 서버 로그 (최근 50줄):"
            ssh ${USER}@${API_HOST} "
                pm2 logs o4o-api-server --lines 50 2>/dev/null || echo '⚠️  로그를 가져올 수 없습니다'
            " 2>/dev/null || log_error "API 서버에 연결할 수 없습니다"
            echo ""
            ;;
    esac
    
    case $service in
        "nginx"|"all")
            log_monitor "Nginx 오류 로그 (최근 20줄):"
            ssh ${USER}@${WEB_HOST} "
                sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo '⚠️  Nginx 오류 로그가 없습니다'
            " 2>/dev/null || log_error "웹서버에 연결할 수 없습니다"
            echo ""
            
            log_monitor "Nginx 접근 로그 (최근 10줄):"
            ssh ${USER}@${WEB_HOST} "
                sudo tail -10 /var/log/nginx/access.log 2>/dev/null | tail -5 || echo '⚠️  Nginx 접근 로그가 없습니다'
            " 2>/dev/null || log_error "웹서버에 연결할 수 없습니다"
            echo ""
            ;;
    esac
}

# 시스템 리소스 확인
check_system_resources() {
    log_header "시스템 리소스 확인"
    echo ""
    
    # API 서버 리소스
    log_monitor "API 서버 리소스 사용량:"
    ssh ${USER}@${API_HOST} "
        echo '💾 메모리 사용량:'
        free -h | head -2
        echo ''
        echo '💽 디스크 사용량:'
        df -h / | head -2
        echo ''
        echo '⚡ CPU 로드 평균:'
        uptime
        echo ''
        echo '🔄 PM2 메모리 사용량:'
        pm2 monit | head -10 2>/dev/null || echo '⚠️  PM2 모니터링 정보 없음'
    " 2>/dev/null || log_error "API 서버에 연결할 수 없습니다"
    
    echo ""
    
    # 웹서버 리소스
    log_monitor "웹서버 리소스 사용량:"
    ssh ${USER}@${WEB_HOST} "
        echo '💾 메모리 사용량:'
        free -h | head -2
        echo ''
        echo '💽 디스크 사용량:'
        df -h / | head -2
        echo ''
        echo '⚡ CPU 로드 평균:'
        uptime
    " 2>/dev/null || log_error "웹서버에 연결할 수 없습니다"
    
    echo ""
}

# 응답 시간 테스트
check_response_times() {
    log_header "응답 시간 테스트"
    echo ""
    
    # API 서버 응답 시간
    log_monitor "API 서버 응답 시간 측정 중..."
    api_time=$(curl -o /dev/null -s -w "%{time_total}" https://api.neture.co.kr/health 2>/dev/null || echo "timeout")
    if [ "$api_time" != "timeout" ]; then
        log_success "API 서버: ${api_time}초"
    else
        log_error "API 서버: 응답 시간 초과"
    fi
    
    # Admin Dashboard 응답 시간
    log_monitor "Admin Dashboard 응답 시간 측정 중..."
    admin_time=$(curl -o /dev/null -s -w "%{time_total}" https://admin.neture.co.kr 2>/dev/null || echo "timeout")
    if [ "$admin_time" != "timeout" ]; then
        log_success "Admin Dashboard: ${admin_time}초"
    else
        log_error "Admin Dashboard: 응답 시간 초과"
    fi
    
    # 메인 웹사이트 응답 시간
    log_monitor "메인 웹사이트 응답 시간 측정 중..."
    main_time=$(curl -o /dev/null -s -w "%{time_total}" https://neture.co.kr 2>/dev/null || echo "timeout")
    if [ "$main_time" != "timeout" ]; then
        log_success "메인 웹사이트: ${main_time}초"
    else
        log_error "메인 웹사이트: 응답 시간 초과"
    fi
    
    echo ""
}

# SSL 인증서 확인
check_ssl_certificates() {
    log_header "SSL 인증서 확인"
    echo ""
    
    domains=("admin.neture.co.kr" "neture.co.kr" "api.neture.co.kr")
    
    for domain in "${domains[@]}"; do
        log_monitor "$domain SSL 인증서 확인 중..."
        
        # SSL 인증서 만료일 확인
        expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
                     openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        
        if [ -n "$expiry_date" ]; then
            expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
            current_timestamp=$(date +%s)
            days_left=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ "$days_left" -gt 30 ]; then
                log_success "$domain: ${days_left}일 남음"
            elif [ "$days_left" -gt 0 ]; then
                log_warning "$domain: ${days_left}일 남음 (갱신 필요)"
            else
                log_error "$domain: 만료됨"
            fi
        else
            log_error "$domain: SSL 인증서 정보를 가져올 수 없음"
        fi
    done
    
    echo ""
}

# 배포 로그 히스토리
show_deploy_history() {
    log_header "최근 배포 히스토리"
    echo ""
    
    local log_dir="$HOME/.o4o-deploy-logs"
    
    if [ -d "$log_dir" ]; then
        log_monitor "최근 배포 로그 파일들:"
        ls -lt "$log_dir"/*.log 2>/dev/null | head -10 | while read -r line; do
            echo "  $line"
        done
        
        echo ""
        log_info "최신 배포 로그를 보려면: tail -f \$(ls -t $log_dir/*.log | head -1)"
    else
        log_warning "배포 로그 디렉토리가 없습니다: $log_dir"
    fi
    
    echo ""
}

# 실시간 모니터링
watch_services() {
    log_header "실시간 서비스 모니터링 시작"
    log_info "종료하려면 Ctrl+C를 누르세요"
    echo ""
    
    while true; do
        clear
        echo "$(date) - O4O Platform 실시간 모니터링"
        echo "============================================"
        
        # 서비스 상태 간단 체크
        if curl -f -s https://api.neture.co.kr/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ API 서버: 정상${NC}"
        else
            echo -e "${RED}❌ API 서버: 오류${NC}"
        fi
        
        if curl -f -s https://admin.neture.co.kr > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Admin Dashboard: 정상${NC}"
        else
            echo -e "${RED}❌ Admin Dashboard: 오류${NC}"
        fi
        
        if curl -f -s https://neture.co.kr > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 메인 웹사이트: 정상${NC}"
        else
            echo -e "${RED}❌ 메인 웹사이트: 오류${NC}"
        fi
        
        echo ""
        echo "최근 PM2 상태:"
        ssh ${USER}@${API_HOST} "pm2 list | head -5" 2>/dev/null || echo "API 서버 연결 실패"
        
        echo ""
        echo "다음 새로고침까지 30초..."
        sleep 30
    done
}

# 헬스체크 전용
health_check() {
    log_header "빠른 헬스체크"
    echo ""
    
    all_healthy=true
    
    # API 서버
    if curl -f -s https://api.neture.co.kr/health > /dev/null 2>&1; then
        log_success "API 서버: 정상"
    else
        log_error "API 서버: 비정상"
        all_healthy=false
    fi
    
    # Admin Dashboard
    if curl -f -s https://admin.neture.co.kr > /dev/null 2>&1; then
        log_success "Admin Dashboard: 정상"
    else
        log_error "Admin Dashboard: 비정상"
        all_healthy=false
    fi
    
    # 메인 웹사이트
    if curl -f -s https://neture.co.kr > /dev/null 2>&1; then
        log_success "메인 웹사이트: 정상"
    else
        log_error "메인 웹사이트: 비정상"
        all_healthy=false
    fi
    
    echo ""
    
    if [ "$all_healthy" = true ]; then
        log_success "🎉 모든 서비스가 정상 동작 중입니다!"
        exit 0
    else
        log_error "⚠️  일부 서비스에 문제가 있습니다."
        exit 1
    fi
}

# 사용법 표시
show_usage() {
    echo "O4O Platform 배포 모니터링 스크립트"
    echo ""
    echo "사용법: $0 [action] [options]"
    echo ""
    echo "액션:"
    echo "  status       - 전체 서비스 상태 확인 (기본값)"
    echo "  health       - 빠른 헬스체크"
    echo "  logs [type]  - 로그 확인 (type: api, nginx, all)"
    echo "  resources    - 시스템 리소스 사용량 확인"
    echo "  response     - 응답 시간 테스트"
    echo "  ssl          - SSL 인증서 상태 확인"
    echo "  history      - 배포 히스토리 확인"
    echo "  watch        - 실시간 모니터링"
    echo ""
    echo "예시:"
    echo "  $0                    # 전체 상태 확인"
    echo "  $0 health            # 빠른 헬스체크"
    echo "  $0 logs api          # API 서버 로그만 확인"
    echo "  $0 resources         # 시스템 리소스 확인"
    echo "  $0 watch             # 실시간 모니터링"
}

# 메인 실행 로직
main() {
    local action=${1:-"status"}
    local option=$2
    
    case $action in
        "status")
            check_service_status
            ;;
        "health")
            health_check
            ;;
        "logs")
            check_logs "$option"
            ;;
        "resources")
            check_system_resources
            ;;
        "response")
            check_response_times
            ;;
        "ssl")
            check_ssl_certificates
            ;;
        "history")
            show_deploy_history
            ;;
        "watch")
            watch_services
            ;;
        "all")
            check_service_status
            check_system_resources
            check_response_times
            check_ssl_certificates
            ;;
        "-h"|"--help"|"help")
            show_usage
            exit 0
            ;;
        *)
            log_error "알 수 없는 액션: $action"
            show_usage
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"