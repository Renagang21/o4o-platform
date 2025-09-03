#!/bin/bash

# 배포 롤백 스크립트
# 이전 버전으로 빠르게 롤백하는 기능 제공

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 설정
DEPLOY_DIR="/home/ubuntu/o4o-platform"
BACKUP_DIR="/home/ubuntu/backups"
MAX_BACKUPS=5
LOG_FILE="/var/log/rollback.log"

# 로그 함수
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# 사용법
usage() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  list              백업 목록 표시"
    echo "  rollback [버전]   특정 버전으로 롤백"
    echo "  quick             가장 최근 백업으로 빠른 롤백"
    echo "  status            현재 배포 상태 확인"
    echo "  backup            현재 버전 백업"
    echo ""
    echo "예제:"
    echo "  $0 list"
    echo "  $0 rollback 2024-01-15_14-30-00"
    echo "  $0 quick"
    exit 1
}

# 백업 목록 표시
list_backups() {
    log "백업 목록 조회 중..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        warning "백업 디렉토리가 없습니다."
        return
    fi
    
    echo ""
    echo "=== 사용 가능한 백업 ==="
    ls -lt $BACKUP_DIR | grep "^d" | awk '{print $9}' | head -$MAX_BACKUPS | while read backup; do
        if [ ! -z "$backup" ]; then
            size=$(du -sh "$BACKUP_DIR/$backup" 2>/dev/null | cut -f1)
            echo "  📦 $backup (크기: $size)"
        fi
    done
    echo ""
}

# 현재 버전 백업
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log "현재 버전 백업 시작: $backup_name"
    
    # 백업 디렉토리 생성
    mkdir -p $BACKUP_DIR
    
    # 중요 파일만 백업 (node_modules 제외)
    rsync -av --exclude='node_modules' \
              --exclude='.git' \
              --exclude='logs' \
              --exclude='*.log' \
              $DEPLOY_DIR/ $backup_path/
    
    # 현재 커밋 정보 저장
    cd $DEPLOY_DIR
    git rev-parse HEAD > $backup_path/COMMIT_HASH
    git log -1 --format="%H %s" > $backup_path/COMMIT_INFO
    
    # PM2 프로세스 정보 저장
    pm2 list --no-color > $backup_path/PM2_STATUS
    pm2 save
    cp ~/.pm2/dump.pm2 $backup_path/pm2_dump.pm2 2>/dev/null || true
    
    # 환경 변수 백업 (민감정보 주의)
    if [ -f "$DEPLOY_DIR/.env" ]; then
        cp $DEPLOY_DIR/.env $backup_path/.env.backup
    fi
    
    log "백업 완료: $backup_path"
    
    # 오래된 백업 삭제
    cleanup_old_backups
}

# 오래된 백업 정리
cleanup_old_backups() {
    local backup_count=$(ls -1 $BACKUP_DIR | wc -l)
    
    if [ $backup_count -gt $MAX_BACKUPS ]; then
        log "오래된 백업 정리 중..."
        ls -t $BACKUP_DIR | tail -n +$((MAX_BACKUPS + 1)) | while read old_backup; do
            log "삭제: $old_backup"
            rm -rf "$BACKUP_DIR/$old_backup"
        done
    fi
}

# 롤백 실행
perform_rollback() {
    local backup_version=$1
    local backup_path="$BACKUP_DIR/$backup_version"
    
    if [ ! -d "$backup_path" ]; then
        error "백업을 찾을 수 없습니다: $backup_version"
    fi
    
    log "롤백 시작: $backup_version"
    
    # 현재 버전 백업 (안전을 위해)
    create_backup
    
    # PM2 프로세스 중지
    log "PM2 프로세스 중지 중..."
    pm2 stop all || true
    
    # 파일 복원
    log "파일 복원 중..."
    rsync -av --delete --exclude='node_modules' \
              --exclude='.git' \
              --exclude='logs' \
              $backup_path/ $DEPLOY_DIR/
    
    # 환경 변수 복원
    if [ -f "$backup_path/.env.backup" ]; then
        cp $backup_path/.env.backup $DEPLOY_DIR/.env
        log "환경 변수 복원됨"
    fi
    
    # Git 상태 복원
    if [ -f "$backup_path/COMMIT_HASH" ]; then
        cd $DEPLOY_DIR
        commit_hash=$(cat $backup_path/COMMIT_HASH)
        git reset --hard $commit_hash || warning "Git 복원 실패"
    fi
    
    # 의존성 재설치
    log "의존성 설치 중..."
    cd $DEPLOY_DIR
    pnpm install --frozen-lockfile --production || pnpm install --production
    
    # PM2 프로세스 복원
    log "PM2 프로세스 재시작 중..."
    if [ -f "$backup_path/pm2_dump.pm2" ]; then
        pm2 resurrect $backup_path/pm2_dump.pm2 || pm2 start ecosystem.config.js
    else
        pm2 start ecosystem.config.js
    fi
    
    # 헬스체크
    sleep 5
    health_check
    
    log "✅ 롤백 완료!"
}

# 빠른 롤백 (최신 백업으로)
quick_rollback() {
    log "빠른 롤백 실행 중..."
    
    latest_backup=$(ls -t $BACKUP_DIR | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "사용 가능한 백업이 없습니다"
    fi
    
    log "최신 백업으로 롤백: $latest_backup"
    perform_rollback $latest_backup
}

# 헬스체크
health_check() {
    log "헬스체크 실행 중..."
    
    # PM2 상태 확인
    if ! pm2 list | grep -q "online"; then
        error "PM2 프로세스가 실행되지 않음"
    fi
    
    # API 헬스체크
    local health_url="http://localhost:3001/health"
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f $health_url > /dev/null 2>&1; then
            log "✅ 헬스체크 성공"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log "헬스체크 시도 $attempt/$max_attempts..."
        sleep 3
    done
    
    error "헬스체크 실패"
}

# 배포 상태 확인
check_status() {
    echo ""
    echo "=== 현재 배포 상태 ==="
    
    # Git 정보
    cd $DEPLOY_DIR
    echo "📍 Git 브랜치: $(git branch --show-current)"
    echo "📍 최근 커밋: $(git log -1 --oneline)"
    
    # PM2 상태
    echo ""
    echo "📍 PM2 프로세스:"
    pm2 list
    
    # 디스크 사용량
    echo ""
    echo "📍 디스크 사용량:"
    df -h $DEPLOY_DIR
    
    # 백업 정보
    echo ""
    echo "📍 백업 상태:"
    if [ -d "$BACKUP_DIR" ]; then
        backup_count=$(ls -1 $BACKUP_DIR 2>/dev/null | wc -l)
        backup_size=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
        echo "  백업 개수: $backup_count"
        echo "  총 크기: $backup_size"
    else
        echo "  백업 없음"
    fi
    
    echo ""
}

# 메인 실행
case "$1" in
    list)
        list_backups
        ;;
    rollback)
        if [ -z "$2" ]; then
            error "롤백할 버전을 지정하세요"
        fi
        perform_rollback $2
        ;;
    quick)
        quick_rollback
        ;;
    status)
        check_status
        ;;
    backup)
        create_backup
        ;;
    *)
        usage
        ;;
esac