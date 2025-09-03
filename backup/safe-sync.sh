#!/bin/bash

# Safe Sync Script - GitHub 동기화 시 보호 파일 유지
# 이 스크립트는 .env 파일과 CLAUDE.md 파일을 보호하면서 GitHub와 동기화합니다.

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 타임스탬프
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".backup/${TIMESTAMP}"

# 1. 보호 파일 백업
log_info "========================================="
log_info "보호 파일 백업 시작..."
log_info "========================================="

# 백업 디렉토리 생성
mkdir -p ${BACKUP_DIR}

# 보호할 파일 목록
PROTECTED_FILES=(
    "CLAUDE.md"
    ".env"
    "apps/api-server/.env"
    "apps/api-server/.env.production"
    "apps/admin-dashboard/.env"
    "apps/admin-dashboard/.env.production"
    "apps/main-site/.env"
    "apps/main-site/.env.production"
    "apps/ecommerce/.env"
    "apps/ecommerce/.env.production"
    "apps/crowdfunding/.env"
    "apps/crowdfunding/.env.production"
    "apps/forum/.env"
    "apps/forum/.env.production"
    "apps/digital-signage/.env"
    "apps/digital-signage/.env.production"
)

# 파일 백업
for file in "${PROTECTED_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "${BACKUP_DIR}/" 2>/dev/null && \
        log_success "백업: $file" || \
        log_warning "백업 실패: $file (파일이 없을 수 있음)"
    fi
done

# 2. Git 상태 확인
log_info "========================================="
log_info "Git 상태 확인..."
log_info "========================================="

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
log_info "현재 브랜치: $CURRENT_BRANCH"

# 변경사항 확인
if [ -n "$(git status --porcelain)" ]; then
    log_warning "스테이지되지 않은 변경사항이 있습니다:"
    git status --short
    
    read -p "변경사항을 stash 하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash push -u -m "safe-sync: ${TIMESTAMP}"
        log_success "변경사항을 stash했습니다."
        STASHED=true
    fi
fi

# 3. GitHub에서 최신 변경사항 가져오기
log_info "========================================="
log_info "GitHub에서 최신 변경사항 가져오기..."
log_info "========================================="

# 변경사항 가져오기 전 현재 커밋 저장
BEFORE_PULL=$(git rev-parse HEAD)

# Pull 수행
git pull origin main || {
    log_error "Pull 실패! 수동으로 해결이 필요합니다."
    exit 1
}

AFTER_PULL=$(git rev-parse HEAD)

if [ "$BEFORE_PULL" != "$AFTER_PULL" ]; then
    log_success "새로운 변경사항을 가져왔습니다."
    
    # 변경된 파일 목록 표시
    log_info "변경된 파일들:"
    git diff --name-only ${BEFORE_PULL}..${AFTER_PULL}
else
    log_info "새로운 변경사항이 없습니다."
fi

# 4. 보호 파일 복원
log_info "========================================="
log_info "보호 파일 복원..."
log_info "========================================="

for file in "${PROTECTED_FILES[@]}"; do
    backup_file="${BACKUP_DIR}/$(basename $file)"
    if [ -f "$backup_file" ]; then
        cp "$backup_file" "$file" 2>/dev/null && \
        log_success "복원: $file" || \
        log_warning "복원 실패: $file"
    fi
done

# 5. Stash 복원 (필요한 경우)
if [ "${STASHED}" = true ]; then
    log_info "========================================="
    log_info "Stash 복원..."
    log_info "========================================="
    
    git stash pop && \
    log_success "Stash를 복원했습니다." || \
    log_warning "Stash 복원 실패. 수동으로 확인이 필요합니다."
fi

# 6. 빌드 필요 여부 확인
log_info "========================================="
log_info "빌드 필요 여부 확인..."
log_info "========================================="

if [ "$BEFORE_PULL" != "$AFTER_PULL" ]; then
    # 변경된 파일 분석
    CHANGED_FILES=$(git diff --name-only ${BEFORE_PULL}..${AFTER_PULL})
    
    # 패키지 변경 확인
    if echo "$CHANGED_FILES" | grep -q "^packages/"; then
        log_warning "패키지가 변경되었습니다. 빌드가 필요할 수 있습니다."
        echo "변경된 패키지:"
        echo "$CHANGED_FILES" | grep "^packages/" | cut -d'/' -f1,2 | sort -u
    fi
    
    # 앱 변경 확인 (API 서버 제외)
    if echo "$CHANGED_FILES" | grep -E "^apps/(admin-dashboard|main-site|ecommerce|crowdfunding|forum|digital-signage)"; then
        log_warning "웹 앱이 변경되었습니다. 빌드가 필요할 수 있습니다."
        echo "변경된 앱:"
        echo "$CHANGED_FILES" | grep -E "^apps/(admin-dashboard|main-site|ecommerce|crowdfunding|forum|digital-signage)" | cut -d'/' -f1,2 | sort -u
        
        echo
        log_info "개별 빌드 명령어 예시:"
        echo "  pnpm run build --workspace=@o4o/[app-name]"
        echo "  또는"
        echo "  pnpm run build:after-pull"
    fi
    
    # API 서버 변경 확인 (경고만)
    if echo "$CHANGED_FILES" | grep -E "^apps/(api-server|api-gateway)"; then
        log_warning "⚠️  API 서버 관련 파일이 변경되었습니다."
        log_warning "⚠️  이 서버(웹 서버)에서는 API 서버를 빌드하지 마세요!"
        log_warning "⚠️  API 서버는 별도 리포지토리(o4o-apiserver)에서 관리됩니다."
    fi
fi

# 7. 완료
log_info "========================================="
log_success "동기화 완료!"
log_info "백업 위치: ${BACKUP_DIR}"
log_info "========================================="

# Git 상태 최종 확인
echo
log_info "현재 Git 상태:"
git status --short

echo
log_info "PM2 프로세스 상태:"
pm2 list

echo
log_success "안전한 동기화가 완료되었습니다!"