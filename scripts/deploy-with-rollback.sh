#!/bin/bash

# ============================================
# O4O Platform 자동 롤백 지원 배포 스크립트
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 설정
BACKUP_DIR="/home/ubuntu/o4o-platform-backups"
CURRENT_DIR="/home/ubuntu/o4o-platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

# 로그 함수
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 롤백 함수
rollback() {
    local backup_path=$1
    log_warning "배포 실패 감지! 자동 롤백을 시작합니다..."
    
    if [ -d "$backup_path" ]; then
        log_info "백업에서 복원 중: $backup_path"
        
        # PM2 프로세스 중지
        pm2 stop o4o-api-server 2>/dev/null || true
        
        # 현재 디렉토리 백업 (실패한 배포)
        mv "$CURRENT_DIR" "${CURRENT_DIR}_failed_$TIMESTAMP" 2>/dev/null || true
        
        # 백업에서 복원
        cp -r "$backup_path" "$CURRENT_DIR"
        
        # PM2 재시작
        cd "$CURRENT_DIR"
        pm2 start ecosystem.config.unified.cjs --env production
        
        log_success "롤백 완료! 이전 버전으로 복원되었습니다."
        
        # 헬스체크
        sleep 5
        if curl -f -s https://api.neture.co.kr/api/health > /dev/null; then
            log_success "롤백된 서비스가 정상 작동 중입니다"
        else
            log_error "롤백 후에도 서비스에 문제가 있습니다"
            exit 1
        fi
    else
        log_error "백업을 찾을 수 없습니다: $backup_path"
        exit 1
    fi
}

# 메인 배포 함수
deploy() {
    log_info "O4O Platform 자동 롤백 지원 배포 시작"
    
    # 백업 디렉토리 생성
    mkdir -p "$BACKUP_DIR"
    
    # 현재 상태 백업
    log_info "현재 상태 백업 중..."
    if [ -d "$CURRENT_DIR" ]; then
        cp -r "$CURRENT_DIR" "$BACKUP_PATH"
        log_success "백업 완료: $BACKUP_PATH"
    fi
    
    # 배포 시도
    (
        cd "$CURRENT_DIR"
        
        # Git 최신 코드 가져오기
        log_info "최신 코드 가져오는 중..."
        git fetch origin
        git pull origin main
        
        # 의존성 설치
        log_info "의존성 설치 중..."
        pnpm install --frozen-lockfile
        
        # 패키지 빌드
        log_info "패키지 빌드 중..."
        pnpm run build:packages
        
        # API 서버 빌드
        log_info "API 서버 빌드 중..."
        cd apps/api-server
        pnpm run build
        cd ../..
        
        # 빌드 성공 확인
        if [ ! -d "apps/api-server/dist" ] || [ -z "$(ls -A apps/api-server/dist)" ]; then
            log_error "빌드 실패: dist 폴더가 비어있습니다"
            exit 1
        fi
        
        # 데이터베이스 마이그레이션
        log_info "데이터베이스 마이그레이션 실행 중..."
        cd apps/api-server
        pnpm run migration:run
        cd ../..
        
        # PM2 재시작
        log_info "PM2 프로세스 재시작 중..."
        pm2 reload ecosystem.config.unified.cjs --env production
        
        # 헬스체크 (30초 대기)
        log_info "헬스체크 수행 중..."
        for i in {1..6}; do
            sleep 5
            if curl -f -s https://api.neture.co.kr/api/health > /dev/null; then
                log_success "헬스체크 통과! 배포가 성공적으로 완료되었습니다"
                
                # 오래된 백업 정리 (7일 이상된 백업 삭제)
                find "$BACKUP_DIR" -name "backup_*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
                
                return 0
            fi
            log_warning "헬스체크 실패... 재시도 중 ($i/6)"
        done
        
        log_error "헬스체크 실패! 서비스가 응답하지 않습니다"
        exit 1
        
    ) || {
        # 배포 실패 시 롤백 실행
        rollback "$BACKUP_PATH"
        return 1
    }
}

# 사용법 표시
show_usage() {
    echo "사용법: $0 [command]"
    echo "Commands:"
    echo "  deploy    - 자동 롤백 지원 배포 실행"
    echo "  rollback  - 마지막 백업으로 수동 롤백"
    echo "  list      - 사용 가능한 백업 목록"
    echo "  cleanup   - 오래된 백업 정리"
}

# 백업 목록 표시
list_backups() {
    log_info "사용 가능한 백업 목록:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | grep "backup_" | tail -10
    else
        log_warning "백업 디렉토리가 없습니다"
    fi
}

# 수동 롤백
manual_rollback() {
    local latest_backup=$(ls -t "$BACKUP_DIR" | grep "backup_" | head -1)
    if [ -n "$latest_backup" ]; then
        rollback "$BACKUP_DIR/$latest_backup"
    else
        log_error "롤백할 백업을 찾을 수 없습니다"
        exit 1
    fi
}

# 메인 실행 로직
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        manual_rollback
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        find "$BACKUP_DIR" -name "backup_*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
        log_success "오래된 백업 정리 완료"
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