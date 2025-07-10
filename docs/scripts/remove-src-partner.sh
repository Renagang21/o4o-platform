#!/bin/bash

# src/partner/ 안전 제거 스크립트
# 작성일: 2025-06-28
# 용도: src/partner/ 폴더를 안전하게 제거하고 백업 생성

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
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

# 프로젝트 루트 확인
if [[ ! -f "package.json" || ! -d "services" ]]; then
    log_error "프로젝트 루트 디렉토리에서 실행해주세요 (package.json과 services/ 폴더가 있는 곳)"
    exit 1
fi

# 백업 디렉토리 생성
BACKUP_DIR="backup/partner-removal-$(date +%Y%m%d-%H%M%S)"
log_info "백업 디렉토리 생성: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "=================================="
echo "src/partner/ 제거 스크립트 시작"
echo "백업 위치: $BACKUP_DIR"
echo "=================================="

# Phase 1: 사전 확인
log_info "Phase 1: 사전 확인 중..."

# Git 상태 확인
if ! git status --porcelain | grep -q "^??"; then
    log_info "Git 워킹 디렉토리가 깨끗합니다"
else
    log_warning "Git에 추적되지 않는 파일들이 있습니다"
    git status --porcelain | grep "^??" || true
fi

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
log_info "현재 브랜치: $CURRENT_BRANCH"

# Phase 2: 전체 프로젝트 백업
log_info "Phase 2: 백업 생성 중..."

# src/partner/ 백업
if [[ -d "src/partner" ]]; then
    log_info "src/partner/ 폴더 백업 중..."
    cp -r src/partner/ "$BACKUP_DIR/src-partner-backup/"
    log_success "src/partner/ 백업 완료"
else
    log_warning "src/partner/ 폴더가 존재하지 않습니다"
fi

# dist/partner/ 백업
if [[ -d "dist/partner" ]]; then
    log_info "dist/partner/ 폴더 백업 중..."
    cp -r dist/partner/ "$BACKUP_DIR/dist-partner-backup/"
    log_success "dist/partner/ 백업 완료"
else
    log_info "dist/partner/ 폴더가 존재하지 않습니다"
fi

# SQLite 데이터베이스 찾기 및 백업
log_info "SQLite 데이터베이스 파일 찾는 중..."
find . -name "*.db" -path "*/partner/*" 2>/dev/null | while read -r db_file; do
    if [[ -f "$db_file" ]]; then
        log_info "데이터베이스 백업: $db_file"
        cp "$db_file" "$BACKUP_DIR/"
    fi
done

# Git 커밋 해시 저장
echo "$(git rev-parse HEAD)" > "$BACKUP_DIR/git-commit-hash.txt"
echo "$CURRENT_BRANCH" > "$BACKUP_DIR/git-branch.txt"

# Phase 3: 의존성 최종 확인
log_info "Phase 3: 의존성 최종 확인 중..."

# src/partner 참조 확인
PARTNER_REFS=$(grep -r "src/partner" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=backup 2>/dev/null | wc -l)
if [[ $PARTNER_REFS -gt 0 ]]; then
    log_error "src/partner에 대한 참조가 발견되었습니다:"
    grep -r "src/partner" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=backup 2>/dev/null || true
    log_error "제거를 중단합니다. 참조를 먼저 제거해주세요."
    exit 1
else
    log_success "src/partner에 대한 참조가 없습니다"
fi

# 사용자 확인
echo ""
log_warning "다음 항목들이 제거됩니다:"
[[ -d "src/partner" ]] && echo "  - src/partner/ (소스 코드)"
[[ -d "dist/partner" ]] && echo "  - dist/partner/ (빌드 아티팩트)"

echo ""
read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "제거가 취소되었습니다"
    exit 0
fi

# Phase 4: 실제 제거
log_info "Phase 4: 파일 제거 중..."

# src/partner/ 제거
if [[ -d "src/partner" ]]; then
    log_info "src/partner/ 폴더 제거 중..."
    rm -rf src/partner/
    log_success "src/partner/ 제거 완료"
fi

# dist/partner/ 제거
if [[ -d "dist/partner" ]]; then
    log_info "dist/partner/ 폴더 제거 중..."
    rm -rf dist/partner/
    log_success "dist/partner/ 제거 완료"
fi

# Phase 5: 검증
log_info "Phase 5: 제거 검증 중..."

if [[ ! -d "src/partner" ]]; then
    log_success "src/partner/ 제거 확인됨"
else
    log_error "src/partner/ 제거 실패"
    exit 1
fi

if [[ ! -d "dist/partner" ]]; then
    log_success "dist/partner/ 제거 확인됨"
else
    log_info "dist/partner/ 없음 (정상)"
fi

# 롤백 스크립트 생성
cat > "$BACKUP_DIR/rollback.sh" << 'EOF'
#!/bin/bash
# 롤백 스크립트 - 자동 생성됨

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "롤백을 시작합니다..."
echo "프로젝트 루트: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# src/partner/ 복원
if [[ -d "$SCRIPT_DIR/src-partner-backup" ]]; then
    echo "src/partner/ 복원 중..."
    cp -r "$SCRIPT_DIR/src-partner-backup" src/partner/
    echo "src/partner/ 복원 완료"
fi

# dist/partner/ 복원
if [[ -d "$SCRIPT_DIR/dist-partner-backup" ]]; then
    echo "dist/partner/ 복원 중..."
    mkdir -p dist
    cp -r "$SCRIPT_DIR/dist-partner-backup" dist/partner/
    echo "dist/partner/ 복원 완료"
fi

echo "롤백이 완료되었습니다."
echo "Git 커밋 상태를 확인하고 필요시 git reset을 수행하세요."
EOF

chmod +x "$BACKUP_DIR/rollback.sh"

# 완료 메시지
echo ""
echo "=================================="
log_success "src/partner/ 제거가 완료되었습니다!"
echo "=================================="
echo ""
echo "📁 백업 위치: $BACKUP_DIR"
echo "🔄 롤백 방법: cd $BACKUP_DIR && ./rollback.sh"
echo ""
echo "다음 단계:"
echo "1. 애플리케이션 테스트 실행"
echo "2. 문제없으면 백업 폴더 정리"
echo "3. Git 커밋 (선택사항)"
echo ""