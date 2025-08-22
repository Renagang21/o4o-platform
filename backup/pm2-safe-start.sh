#!/bin/bash

# PM2 안전 시작 스크립트
# 목적: PM2 설정 파일 실행 전 환경 검증 후 안전하게 시작
# 작성일: 2025-08-18
# 작성자: O4O Platform Team

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 스크립트 디렉토리
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VALIDATOR_SCRIPT="$SCRIPT_DIR/pm2-env-validator.sh"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# 사용법 출력
usage() {
    echo "사용법: $0 <PM2 설정 파일> [옵션]"
    echo ""
    echo "옵션:"
    echo "  --force    검증 실패 시에도 강제 실행 (권장하지 않음)"
    echo "  --dry-run  실제 실행 없이 검증만 수행"
    echo "  --help     이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0 ecosystem.config.local.cjs"
    echo "  $0 ecosystem.config.apiserver.cjs --dry-run"
    exit 0
}

# 메인 함수
main() {
    local config_file=""
    local force_mode=false
    local dry_run=false
    
    # 인자 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                force_mode=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            *)
                if [ -z "$config_file" ]; then
                    config_file="$1"
                fi
                shift
                ;;
        esac
    done
    
    # 설정 파일 확인
    if [ -z "$config_file" ]; then
        log_error "PM2 설정 파일을 지정해주세요"
        usage
    fi
    
    if [ ! -f "$config_file" ]; then
        log_error "설정 파일을 찾을 수 없습니다: $config_file"
        exit 1
    fi
    
    log_info "=== PM2 안전 시작 스크립트 ==="
    log_info "설정 파일: $config_file"
    
    # 환경 검증 실행
    if [ -x "$VALIDATOR_SCRIPT" ]; then
        log_info "환경 검증 중..."
        if $VALIDATOR_SCRIPT "$config_file"; then
            log_info "✅ 환경 검증 통과"
        else
            if [ "$force_mode" = true ]; then
                log_warning "⚠️  환경 검증 실패했지만 강제 실행 모드로 계속합니다"
            else
                log_error "❌ 환경 검증 실패. 실행을 중단합니다"
                log_error "강제 실행하려면 --force 옵션을 사용하세요 (권장하지 않음)"
                exit 1
            fi
        fi
    else
        log_warning "검증 스크립트를 찾을 수 없습니다: $VALIDATOR_SCRIPT"
    fi
    
    # Dry-run 모드
    if [ "$dry_run" = true ]; then
        log_info "🔍 Dry-run 모드: 실제 실행하지 않음"
        log_info "실행될 명령: pm2 start $config_file"
        exit 0
    fi
    
    # PM2 시작
    log_info "PM2 프로세스 시작 중..."
    if pm2 start "$config_file"; then
        log_info "✅ PM2 프로세스가 성공적으로 시작되었습니다"
        
        # 프로세스 상태 표시
        sleep 2
        pm2 status
        
        # 로그 위치 안내
        log_info ""
        log_info "로그 확인: pm2 logs"
        log_info "모니터링: pm2 monit"
        log_info "중지: pm2 stop all"
    else
        log_error "❌ PM2 시작 실패"
        exit 1
    fi
}

# 스크립트 실행
main "$@"