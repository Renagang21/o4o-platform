#!/bin/bash

# O4O Platform 업데이트 스크립트

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

info() {
    log "${BLUE}ℹ $1${NC}"
}

success() {
    log "${GREEN}✓ $1${NC}"
}

warning() {
    log "${YELLOW}⚠ $1${NC}"
}

error() {
    log "${RED}✗ $1${NC}"
}

# 설정 변수
PLATFORM_DIR="/opt/o4o-platform"
BACKUP_DIR="/opt/backups/platform-updates"
FORCE_UPDATE="false"
SKIP_BACKUP="false"
UPDATE_DEPS="true"
RESTART_SERVICES="true"

# 도움말 표시
show_help() {
    cat << EOF
O4O Platform 업데이트 스크립트

사용법: $0 [OPTIONS]

옵션:
    --force                 강제 업데이트 (충돌 시 덮어쓰기)
    --skip-backup          백업 생략
    --no-deps              의존성 업데이트 생략
    --no-restart           서비스 재시작 생략
    --check-only           업데이트 가능 여부만 확인
    --rollback             이전 버전으로 롤백
    --list-backups         사용 가능한 백업 목록 표시
    --help, -h             도움말 표시

예제:
    $0                     # 일반 업데이트
    $0 --check-only        # 업데이트 사용 가능 여부 확인
    $0 --force --no-deps   # 강제 업데이트, 의존성 생략
    $0 --rollback          # 롤백
EOF
}

# 인자 처리
CHECK_ONLY="false"
ROLLBACK="false"
LIST_BACKUPS="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_UPDATE="true"
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP="true"
            shift
            ;;
        --no-deps)
            UPDATE_DEPS="false"
            shift
            ;;
        --no-restart)
            RESTART_SERVICES="false"
            shift
            ;;
        --check-only)
            CHECK_ONLY="true"
            shift
            ;;
        --rollback)
            ROLLBACK="true"
            shift
            ;;
        --list-backups)
            LIST_BACKUPS="true"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            error "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
done

# 백업 목록 표시
if [ "$LIST_BACKUPS" = "true" ]; then
    info "사용 가능한 백업 목록:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | grep "^d" | awk '{print $9}' | grep -v "^\.$" | grep -v "^\.\.$" | sort -r
    else
        warning "백업 디렉토리가 없습니다."
    fi
    exit 0
fi

# 플랫폼 디렉토리 확인
if [ ! -d "$PLATFORM_DIR" ]; then
    error "O4O Platform이 설치되어 있지 않습니다: $PLATFORM_DIR"
    exit 1
fi

cd "$PLATFORM_DIR"

# Git 저장소 확인
if [ ! -d ".git" ]; then
    error "이 디렉토리는 Git 저장소가 아닙니다."
    exit 1
fi

# 현재 상태 확인
info "현재 O4O Platform 상태 확인 중..."
current_commit=$(git rev-parse HEAD)
current_branch=$(git branch --show-current)

info "현재 브랜치: $current_branch"
info "현재 커밋: $current_commit"

# 원격 업데이트 확인
info "원격 저장소에서 업데이트 확인 중..."
git fetch origin

remote_commit=$(git rev-parse origin/$current_branch)

if [ "$current_commit" = "$remote_commit" ]; then
    success "O4O Platform이 이미 최신 버전입니다."
    if [ "$CHECK_ONLY" = "true" ]; then
        exit 0
    elif [ "$FORCE_UPDATE" = "false" ]; then
        info "강제 업데이트를 원하는 경우 --force 옵션을 사용하세요."
        exit 0
    fi
else
    info "새로운 업데이트가 사용 가능합니다."
    info "원격 커밋: $remote_commit"
fi

if [ "$CHECK_ONLY" = "true" ]; then
    info "업데이트 가능한 커밋이 있습니다."
    git log --oneline ${current_commit}..${remote_commit}
    exit 0
fi

# 롤백 처리
if [ "$ROLLBACK" = "true" ]; then
    info "롤백 실행 중..."
    
    if [ ! -f "$PLATFORM_DIR/.last_update_backup" ]; then
        error "롤백할 백업을 찾을 수 없습니다."
        exit 1
    fi
    
    backup_path=$(cat "$PLATFORM_DIR/.last_update_backup")
    if [ ! -d "$backup_path" ]; then
        error "백업 디렉토리가 존재하지 않습니다: $backup_path"
        exit 1
    fi
    
    # 서비스 중지
    if [ "$RESTART_SERVICES" = "true" ]; then
        info "서비스 중지 중..."
        pm2 stop all 2>/dev/null || true
    fi
    
    # 백업에서 복원
    info "백업에서 복원 중: $backup_path"
    rsync -av --delete "$backup_path/" "$PLATFORM_DIR/"
    
    # 서비스 재시작
    if [ "$RESTART_SERVICES" = "true" ]; then
        info "서비스 재시작 중..."
        pm2 restart all 2>/dev/null || true
    fi
    
    success "롤백 완료"
    exit 0
fi

# 백업 생성
if [ "$SKIP_BACKUP" = "false" ]; then
    info "백업 생성 중..."
    
    backup_name="platform-update-$(date +%Y%m%d-%H%M%S)"
    backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$BACKUP_DIR"
    
    # 전체 플랫폼 백업
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='*.log' \
          "$PLATFORM_DIR/" "$backup_path/"
    
    # 데이터베이스 백업 (옵션)
    if command -v pg_dump &> /dev/null && [ -n "${DB_PASSWORD:-}" ]; then
        info "데이터베이스 백업 중..."
        PGPASSWORD="$DB_PASSWORD" pg_dump -h "${DB_HOST:-localhost}" -U "${DB_USER:-o4o_user}" \
                  -d "${DB_NAME:-o4o_platform}" > "$backup_path/database-backup.sql" || \
                  warning "데이터베이스 백업 실패"
    fi
    
    echo "$backup_path" > "$PLATFORM_DIR/.last_update_backup"
    success "백업 생성 완료: $backup_path"
    
    # 오래된 백업 정리 (7일 이상)
    find "$BACKUP_DIR" -type d -name "platform-update-*" -mtime +7 -exec rm -rf {} + 2>/dev/null || true
fi

# 업데이트 실행
info "O4O Platform 업데이트 실행 중..."

# Git 업데이트
if [ "$FORCE_UPDATE" = "true" ]; then
    git reset --hard origin/$current_branch
else
    if ! git merge --ff-only origin/$current_branch; then
        error "자동 병합이 불가능합니다. --force 옵션을 사용하거나 수동으로 충돌을 해결하세요."
        exit 1
    fi
fi

success "Git 업데이트 완료"

# 스크립트 권한 업데이트
chmod +x scripts/*.sh

# 의존성 업데이트
if [ "$UPDATE_DEPS" = "true" ]; then
    info "의존성 업데이트 중..."
    
    # API 서버 의존성 업데이트
    if [ -d "/opt/o4o-api-server/services/api-server" ]; then
        cd "/opt/o4o-api-server/services/api-server"
        if [ -f "package.json" ]; then
            npm install
            npm run build 2>/dev/null || warning "API 서버 빌드 실패"
        fi
    fi
    
    # 웹 서비스 의존성 업데이트
    web_services=("main-site" "ecommerce" "forum" "crowdfunding" "signage")
    for service in "${web_services[@]}"; do
        service_dir="/opt/o4o-web-servers/$service/services/$service"
        if [ -d "$service_dir" ] && [ -f "$service_dir/package.json" ]; then
            cd "$service_dir"
            npm install
            npm run build 2>/dev/null || warning "$service 빌드 실패"
        fi
    done
    
    cd "$PLATFORM_DIR"
fi

# 서비스 재시작
if [ "$RESTART_SERVICES" = "true" ]; then
    info "서비스 재시작 중..."
    
    # PM2 서비스 재시작
    if command -v pm2 &> /dev/null; then
        pm2 restart all || warning "PM2 서비스 재시작 실패"
        pm2 save || true
    fi
    
    # Nginx 재로드
    if command -v nginx &> /dev/null; then
        nginx -t && systemctl reload nginx || warning "Nginx 재로드 실패"
    fi
    
    # 웹훅 서버 재시작 (있는 경우)
    if systemctl is-active --quiet o4o-webhook; then
        systemctl restart o4o-webhook || warning "웹훅 서버 재시작 실패"
    fi
fi

# 업데이트 후 검증
info "업데이트 후 검증 중..."

# 서비스 상태 확인
if command -v pm2 &> /dev/null; then
    pm2_status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null | wc -l)
    if [ "$pm2_status" -eq 0 ]; then
        success "모든 PM2 서비스가 정상 실행 중"
    else
        warning "일부 PM2 서비스가 중단되었습니다."
    fi
fi

# 헬스체크 실행
if [ -f "$PLATFORM_DIR/scripts/health-check.sh" ]; then
    info "헬스체크 실행 중..."
    "$PLATFORM_DIR/scripts/health-check.sh" --quick || warning "헬스체크에서 문제가 발견되었습니다."
fi

# 업데이트 완료
success "=== O4O Platform 업데이트 완료 ==="

new_commit=$(git rev-parse HEAD)
info "업데이트된 커밋: $new_commit"

if [ "$current_commit" != "$new_commit" ]; then
    info "변경된 내용:"
    git log --oneline ${current_commit}..${new_commit}
fi

info "다음 단계:"
echo "1. 서비스 상태 모니터링: pm2 status"
echo "2. 로그 확인: tail -f /var/log/o4o-*.log"
echo "3. 웹사이트 기능 테스트"

if [ "$SKIP_BACKUP" = "false" ]; then
    echo "4. 문제 시 롤백: $0 --rollback"
fi

success "O4O Platform이 성공적으로 업데이트되었습니다! 🎉"