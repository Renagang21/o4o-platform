#!/bin/bash

# PM2 환경 검증 스크립트
# 목적: PM2 설정 파일 실행 전 서버 환경과 설정 파일 매칭 검증
# 작성일: 2025-08-18
# 작성자: O4O Platform Team

set -e  # 오류 발생시 즉시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# 환경 변수 체크
detect_server_type() {
    local server_type=""
    
    # 1. 환경 변수로 확인
    if [ ! -z "$SERVER_TYPE" ]; then
        server_type="$SERVER_TYPE"
        log_info "서버 타입 감지 (환경변수): $server_type"
    # 2. 호스트명으로 확인
    elif [[ "$(hostname)" == *"webserver"* ]]; then
        server_type="webserver"
        log_info "서버 타입 감지 (hostname): webserver"
    elif [[ "$(hostname)" == *"apiserver"* ]]; then
        server_type="apiserver"
        log_info "서버 타입 감지 (hostname): apiserver"
    # 3. 설치된 패키지로 확인
    elif [ -d "/home/ubuntu/o4o-webserver" ]; then
        server_type="webserver"
        log_info "서버 타입 감지 (디렉토리): webserver"
    elif [ -d "/home/ubuntu/o4o-apiserver" ]; then
        server_type="apiserver"
        log_info "서버 타입 감지 (디렉토리): apiserver"
    # 4. 로컬 개발 환경
    elif [ -f ".env.local" ] || [ "$USER" == "user" ]; then
        server_type="local"
        log_info "서버 타입 감지: 로컬 개발 환경"
    else
        server_type="unknown"
        log_warning "서버 타입을 감지할 수 없습니다"
    fi
    
    echo "$server_type"
}

# PM2 설정 파일 검증
validate_pm2_config() {
    local config_file="$1"
    local server_type="$2"
    
    if [ ! -f "$config_file" ]; then
        log_error "설정 파일을 찾을 수 없습니다: $config_file"
        return 1
    fi
    
    local config_basename=$(basename "$config_file")
    
    # 설정 파일과 서버 타입 매칭 검증
    case "$server_type" in
        "webserver")
            if [[ "$config_basename" != *"webserver"* ]]; then
                log_error "❌ 웹서버에서 잘못된 설정 파일 실행 시도!"
                log_error "   서버: webserver"
                log_error "   설정 파일: $config_basename"
                log_error "   올바른 파일: ecosystem.config.webserver.cjs"
                return 1
            fi
            ;;
        "apiserver")
            if [[ "$config_basename" != *"apiserver"* ]]; then
                log_error "❌ API서버에서 잘못된 설정 파일 실행 시도!"
                log_error "   서버: apiserver"
                log_error "   설정 파일: $config_basename"
                log_error "   올바른 파일: ecosystem.config.apiserver.cjs"
                return 1
            fi
            ;;
        "local")
            if [[ "$config_basename" != *"local"* ]] && [[ "$config_basename" != "ecosystem.config.cjs" ]]; then
                log_warning "로컬 환경에서는 ecosystem.config.local.cjs 사용을 권장합니다"
            fi
            ;;
        *)
            log_warning "알 수 없는 서버 타입: $server_type"
            ;;
    esac
    
    # 설정 파일 내용 검증
    if [ "$server_type" == "webserver" ]; then
        if grep -q "api-server" "$config_file" || grep -q "o4o-api" "$config_file"; then
            log_error "❌ 웹서버 설정에 API 서버 프로세스가 포함되어 있습니다!"
            return 1
        fi
    elif [ "$server_type" == "apiserver" ]; then
        if grep -q "admin-dashboard" "$config_file" || grep -q "storefront" "$config_file"; then
            log_error "❌ API서버 설정에 프론트엔드 프로세스가 포함되어 있습니다!"
            return 1
        fi
    fi
    
    log_info "✅ 설정 파일 검증 통과: $config_basename"
    return 0
}

# 현재 실행 중인 PM2 프로세스 체크
check_running_processes() {
    local server_type="$1"
    
    log_info "현재 실행 중인 PM2 프로세스 확인..."
    
    local pm2_list=$(pm2 list --no-color 2>/dev/null || echo "")
    
    if [ "$server_type" == "webserver" ]; then
        if echo "$pm2_list" | grep -q "o4o-api"; then
            log_warning "⚠️  웹서버에서 API 프로세스가 실행 중입니다!"
            log_warning "   'pm2 delete o4o-api'로 중지하세요"
        fi
    elif [ "$server_type" == "apiserver" ]; then
        if echo "$pm2_list" | grep -q "o4o-admin\|o4o-storefront"; then
            log_warning "⚠️  API서버에서 프론트엔드 프로세스가 실행 중입니다!"
            log_warning "   'pm2 delete o4o-admin o4o-storefront'로 중지하세요"
        fi
    fi
}

# 로그 기록
log_validation() {
    local config_file="$1"
    local server_type="$2"
    local result="$3"
    local log_file="/var/log/pm2-validation.log"
    
    # 로그 디렉토리가 없으면 홈 디렉토리에 기록
    if [ ! -w "/var/log" ]; then
        log_file="$HOME/pm2-validation.log"
    fi
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server: $server_type, Config: $(basename "$config_file"), Result: $result" >> "$log_file"
}

# 메인 실행 함수
main() {
    local config_file="${1:-}"
    
    if [ -z "$config_file" ]; then
        log_error "사용법: $0 <PM2 설정 파일>"
        exit 1
    fi
    
    log_info "=== PM2 환경 검증 시작 ==="
    
    # 서버 타입 감지
    local server_type=$(detect_server_type)
    
    # 설정 파일 검증
    if validate_pm2_config "$config_file" "$server_type"; then
        check_running_processes "$server_type"
        log_validation "$config_file" "$server_type" "SUCCESS"
        log_info "=== 검증 완료: 안전하게 실행 가능 ==="
        exit 0
    else
        log_validation "$config_file" "$server_type" "FAILED"
        log_error "=== 검증 실패: 실행 중단 ==="
        log_error "올바른 설정 파일을 사용하세요!"
        
        # 올바른 명령어 안내
        case "$server_type" in
            "webserver")
                log_info "올바른 명령: pm2 start ecosystem.config.webserver.cjs"
                ;;
            "apiserver")
                log_info "올바른 명령: pm2 start ecosystem.config.apiserver.cjs"
                ;;
            "local")
                log_info "올바른 명령: npm run pm2:start:local"
                ;;
        esac
        
        exit 1
    fi
}

# 스크립트 실행
main "$@"