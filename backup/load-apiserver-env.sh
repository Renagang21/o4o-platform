#!/bin/bash

# ======================================
# API서버 환경변수 자동 로드 스크립트
# ======================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ======================================
# 환경 감지 및 설정
# ======================================

detect_environment() {
    # 1. 명시적 SERVER_TYPE 확인
    if [ -n "$SERVER_TYPE" ]; then
        log_info "SERVER_TYPE이 이미 설정됨: $SERVER_TYPE"
        return 0
    fi
    
    # 2. 호스트명으로 환경 감지
    HOSTNAME=$(hostname)
    case "$HOSTNAME" in
        *apiserver*)
            export SERVER_TYPE="apiserver"
            log_info "호스트명에서 API서버 환경 감지: $HOSTNAME"
            ;;
        *webserver*)
            export SERVER_TYPE="webserver"
            log_warning "웹서버 환경에서 API서버 스크립트 실행 중"
            ;;
        *)
            export SERVER_TYPE="local"
            log_info "로컬 개발 환경으로 설정"
            ;;
    esac
}

# ======================================
# 환경변수 파일 로드
# ======================================

load_env_files() {
    local env_loaded=false
    
    # 1. 시스템 환경변수 파일 확인
    if [ -f "/etc/profile.d/o4o-apiserver.sh" ]; then
        log_info "시스템 환경변수 로드: /etc/profile.d/o4o-apiserver.sh"
        source /etc/profile.d/o4o-apiserver.sh
        env_loaded=true
    fi
    
    # 2. 프로젝트 환경변수 파일 확인
    if [ "$SERVER_TYPE" = "apiserver" ]; then
        if [ -f ".env.apiserver" ]; then
            log_info "API서버 환경변수 로드: .env.apiserver"
            export $(grep -v '^#' .env.apiserver | xargs)
            env_loaded=true
        fi
    elif [ "$SERVER_TYPE" = "local" ]; then
        if [ -f ".env.local" ]; then
            log_info "로컬 환경변수 로드: .env.local"
            export $(grep -v '^#' .env.local | xargs)
            env_loaded=true
        fi
    fi
    
    # 3. 기본 .env 파일
    if [ ! "$env_loaded" = true ] && [ -f ".env" ]; then
        log_info "기본 환경변수 로드: .env"
        export $(grep -v '^#' .env | xargs)
        env_loaded=true
    fi
    
    if [ ! "$env_loaded" = true ]; then
        log_warning "환경변수 파일을 찾을 수 없음"
    fi
}

# ======================================
# API서버 전용 환경변수 설정
# ======================================

set_apiserver_env() {
    # API서버 기본 설정
    export NODE_ENV=${NODE_ENV:-"production"}
    export PORT=${PORT:-"3001"}
    export API_PREFIX=${API_PREFIX:-"/api"}
    
    # 데이터베이스 설정
    export DB_HOST=${DB_HOST:-"localhost"}
    export DB_PORT=${DB_PORT:-"5432"}
    export DB_NAME=${DB_NAME:-"o4o_platform"}
    
    # Redis 설정
    export REDIS_HOST=${REDIS_HOST:-"localhost"}
    export REDIS_PORT=${REDIS_PORT:-"6379"}
    
    # JWT 설정 (프로덕션에서는 반드시 변경 필요)
    if [ "$NODE_ENV" = "production" ] && [ -z "$JWT_SECRET" ]; then
        log_error "프로덕션 환경에서 JWT_SECRET이 설정되지 않음!"
        exit 1
    fi
    
    # 메모리 최적화
    export NODE_OPTIONS="--max-old-space-size=2048"
    
    log_success "API서버 환경변수 설정 완료"
}

# ======================================
# 환경변수 검증
# ======================================

validate_env() {
    local validation_passed=true
    
    # 필수 환경변수 확인
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "DB_USERNAME"
        "DB_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "필수 환경변수 누락: $var"
            validation_passed=false
        fi
    done
    
    # 프로덕션 환경 추가 검증
    if [ "$NODE_ENV" = "production" ]; then
        local prod_required=(
            "JWT_SECRET"
            "JWT_REFRESH_SECRET"
            "REDIS_HOST"
            "REDIS_PASSWORD"
        )
        
        for var in "${prod_required[@]}"; do
            if [ -z "${!var}" ]; then
                log_error "프로덕션 필수 환경변수 누락: $var"
                validation_passed=false
            fi
        done
    fi
    
    if [ "$validation_passed" = true ]; then
        log_success "환경변수 검증 통과"
        return 0
    else
        log_error "환경변수 검증 실패"
        return 1
    fi
}

# ======================================
# 환경 정보 출력
# ======================================

print_env_info() {
    echo ""
    echo "======================================="
    echo "  API서버 환경 설정 정보"
    echo "======================================="
    echo "SERVER_TYPE: ${SERVER_TYPE}"
    echo "NODE_ENV: ${NODE_ENV}"
    echo "PORT: ${PORT}"
    echo "DB_HOST: ${DB_HOST}"
    echo "DB_PORT: ${DB_PORT}"
    echo "DB_NAME: ${DB_NAME}"
    echo "API_PREFIX: ${API_PREFIX}"
    echo "NODE_OPTIONS: ${NODE_OPTIONS}"
    echo "======================================="
    echo ""
}

# ======================================
# 메인 실행
# ======================================

main() {
    log_info "API서버 환경변수 자동 로드 시작..."
    
    # 1. 환경 감지
    detect_environment
    
    # 2. 환경변수 파일 로드
    load_env_files
    
    # 3. API서버 전용 설정
    set_apiserver_env
    
    # 4. 환경변수 검증
    if validate_env; then
        # 5. 정보 출력
        print_env_info
        log_success "API서버 환경 설정 완료!"
    else
        log_error "환경 설정 실패. 환경변수를 확인하세요."
        exit 1
    fi
}

# 스크립트가 직접 실행될 때만 main 함수 호출
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

# npm 스크립트에서 source로 실행될 경우 환경변수만 설정
export APISERVER_ENV_LOADED=true