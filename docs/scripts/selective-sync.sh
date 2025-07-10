#!/bin/bash
# selective-sync.sh
# O4O 플랫폼 선택적 동기화 스크립트 (cone mode 우선)
# 최종 업데이트: 2025-06-19
# Git 2.34.1 cone mode 최적화

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
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

# Git 버전 확인
check_git_version() {
    local git_version=$(git --version | cut -d' ' -f3)
    local min_version="2.25.0"
    
    if [[ $(echo -e "$git_version\n$min_version" | sort -V | head -1) == "$min_version" ]]; then
        echo "modern"  # cone mode 지원
    else
        echo "legacy"  # 구형 방식만 지원
    fi
}

# 백업 생성
create_backup() {
    local backup_name="selective_sync_backup_$(date +%Y%m%d_%H%M%S)"
    log_info "백업 생성 중: $backup_name"
    
    if git diff --quiet && git diff --cached --quiet; then
        log_warning "백업할 변경사항이 없습니다"
        echo "no_changes" > .last_backup
    else
        if git stash push -m "$backup_name" 2>/dev/null; then
            log_success "백업 생성 완료: $backup_name"
            echo "$backup_name" > .last_backup
        else
            log_warning "백업 생성 실패 (stash 오류)"
            echo "failed" > .last_backup
        fi
    fi
}

# 현재 상태 진단
diagnose_current_state() {
    log_info "현재 상태 진단 중..."
    
    local server_type=$(detect_server_type)
    local git_version_type=$(check_git_version)
    
    echo "📊 시스템 정보:"
    echo "  - Git 버전: $(git --version | cut -d' ' -f3) ($git_version_type)"
    echo "  - 서버 타입: $server_type"
    echo "  - 브랜치: $(git branch --show-current)"
    echo "  - 변경사항: $(git status --porcelain | wc -l)개"
    echo "  - 총 파일: $(git ls-files | wc -l)개"
    
    # Sparse checkout 상태
    local sparse_enabled=$(git config core.sparseCheckout 2>/dev/null || echo "false")
    local cone_mode=$(git config core.sparseCheckoutCone 2>/dev/null || echo "false")
    
    echo "  - Sparse checkout: $sparse_enabled"
    echo "  - Cone mode: $cone_mode"
    
    if [ "$sparse_enabled" = "true" ]; then
        if [ "$cone_mode" = "true" ] && command -v git sparse-checkout >/dev/null 2>&1; then
            echo "  - 설정 방식: 최신 cone mode"
            local pattern_count=$(git sparse-checkout list | wc -l)
            echo "  - 패턴 수: $pattern_count 개"
        elif [ -f .git/info/sparse-checkout ]; then
            echo "  - 설정 방식: 기존 방식"
            echo "  - 패턴 수: $(wc -l < .git/info/sparse-checkout) 개"
        else
            echo "  - 설정 방식: 오류 (설정 없음)"
        fi
    fi
    
    # services 폴더 상태
    echo ""
    echo "📁 Services 폴더 상태:"
    if [ -d "services" ]; then
        echo "  - services/ 존재: ✅"
        local service_count=$(ls services/ 2>/dev/null | wc -l)
        echo "  - 하위 폴더: $service_count 개"
        if [ "$service_count" -gt 0 ]; then
            ls services/ | sed 's/^/    - /'
        fi
    else
        echo "  - services/ 존재: ❌"
    fi
}

# Modern Git (2.25+) cone mode 설정
apply_cone_mode() {
    local server_type=$1
    
    log_step "최신 cone mode 적용 중..."
    
    # 기존 설정 정리
    git config core.sparseCheckout false 2>/dev/null || true
    rm -f .git/info/sparse-checkout 2>/dev/null || true
    
    # Cone mode 초기화
    git sparse-checkout init --cone
    
    # 서버별 패턴 설정
    case $server_type in
        "webserver")
            log_info "웹서버용 패턴 적용 중..."
            git sparse-checkout set services/main-site scripts
            
            # 웹개발 관련 파일들 추가
            git sparse-checkout add \
                package.json \
                package-lock.json \
                tsconfig.json \
                next.config.js \
                tailwind.config.js \
                .env.example \
                .gitignore \
                README.md \
                vercel.json \
                ecosystem.config.cjs
            ;;
            
        "apiserver")
            log_info "API서버용 패턴 적용 중..."
            git sparse-checkout set services/api-server scripts
            
            # API 관련 파일들 추가
            git sparse-checkout add \
                package.json \
                package-lock.json \
                ecosystem.config.js \
                ecosystem.config.cjs \
                .env.example \
                .gitignore \
                README.md
            ;;
            
        "development")
            log_info "개발환경용 패턴 적용 중..."
            git sparse-checkout set services scripts docs .github
            
            # 개발 관련 파일들 추가
            git sparse-checkout add \
                package.json \
                package-lock.json \
                tsconfig.json \
                .env.example \
                .gitignore \
                README.md \
                docker-compose.yml \
                docker-compose.production.yml
            ;;
            
        *)
            log_warning "알 수 없는 서버 타입, 기본 패턴 적용"
            git sparse-checkout set services scripts
            git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md
            ;;
    esac
    
    log_success "Cone mode 설정 완료"
}

# Legacy Git (2.24-) 설정
apply_legacy_mode() {
    local server_type=$1
    
    log_step "기존 방식 sparse-checkout 적용 중..."
    
    # sparse-checkout 활성화
    git config core.sparseCheckout true
    
    # 서버별 패턴 파일 생성
    case $server_type in
        "webserver")
            log_info "웹서버용 패턴 생성 중..."
            cat > .git/info/sparse-checkout << 'EOF'
# 웹서버 전용 파일들
services/main-site/
scripts/

# 기본 설정 파일들
package.json
package-lock.json
tsconfig.json
next.config.js
tailwind.config.js
.env.example
.gitignore
README.md
vercel.json
ecosystem.config.cjs
EOF
            ;;
            
        "apiserver")
            log_info "API서버용 패턴 생성 중..."
            cat > .git/info/sparse-checkout << 'EOF'
# API서버 전용 파일들
services/api-server/
scripts/

# 기본 설정 파일들
package.json
package-lock.json
ecosystem.config.js
ecosystem.config.cjs
.env.example
.gitignore
README.md
EOF
            ;;
            
        "development")
            log_info "개발환경용 패턴 생성 중..."
            cat > .git/info/sparse-checkout << 'EOF'
# 개발환경 전용 (전체)
services/
scripts/
docs/
.github/

# 설정 파일들
package.json
package-lock.json
tsconfig.json
.env.example
.gitignore
README.md
docker-compose.yml
docker-compose.production.yml
EOF
            ;;
            
        *)
            log_warning "알 수 없는 서버 타입, 기본 패턴 적용"
            cat > .git/info/sparse-checkout << 'EOF'
services/
scripts/
package.json
package-lock.json
.env.example
.gitignore
README.md
EOF
            ;;
    esac
    
    # 설정 적용
    git read-tree -m -u HEAD
    
    log_success "기존 방식 설정 완료"
}

# 설정 적용
apply_selective_sync() {
    local server_type=$1
    local force_legacy=${2:-false}
    
    local git_version_type=$(check_git_version)
    
    if [ "$force_legacy" = "true" ] || [ "$git_version_type" = "legacy" ]; then
        if [ "$git_version_type" = "legacy" ]; then
            log_warning "Git 버전이 구형입니다. 기존 방식을 사용합니다."
        fi
        apply_legacy_mode "$server_type"
    else
        apply_cone_mode "$server_type"
    fi
    
    # 적용 결과 출력
    echo ""
    echo "📊 적용 결과:"
    echo "  - 동기화된 파일: $(git ls-files | wc -l)개"
    
    if [ "$git_version_type" = "modern" ] && [ "$force_legacy" != "true" ]; then
        echo "  - 설정 패턴: $(git sparse-checkout list | wc -l) 개"
        echo "  - 설정 방식: 최신 cone mode"
    else
        echo "  - 설정 라인: $(wc -l < .git/info/sparse-checkout) 라인"
        echo "  - 설정 방식: 기존 방식"
    fi
    
    # Git 상태 확인
    if git status | grep -q "sparse checkout"; then
        local sparse_info=$(git status | grep "sparse checkout" | head -1)
        echo "  - 상태: $sparse_info"
    fi
}

# 검증
verify_sync() {
    log_info "동기화 결과 검증 중..."
    
    local errors=0
    local server_type=$(detect_server_type)
    
    # 서버별 필수 확인 사항
    case $server_type in
        "webserver")
            # main-site 확인
            if [ ! -d "services/main-site" ]; then
                log_error "필수 폴더 누락: services/main-site"
                errors=$((errors + 1))
            else
                log_success "웹서버 폴더 확인: services/main-site"
            fi
            
            # 불필요한 폴더 확인
            if [ -d "services/api-server" ]; then
                log_warning "불필요한 폴더 존재: services/api-server"
            fi
            ;;
            
        "apiserver")
            # api-server 확인
            if [ ! -d "services/api-server" ]; then
                log_error "필수 폴더 누락: services/api-server"
                errors=$((errors + 1))
            else
                log_success "API서버 폴더 확인: services/api-server"
            fi
            
            # 불필요한 폴더 확인
            if [ -d "services/main-site" ]; then
                log_warning "불필요한 폴더 존재: services/main-site"
            fi
            ;;
            
        "development")
            # 개발환경은 모든 폴더 있어야 함
            local required_dirs=("services/main-site" "services/api-server" "scripts")
            for dir in "${required_dirs[@]}"; do
                if [ ! -d "$dir" ]; then
                    log_error "필수 폴더 누락: $dir"
                    errors=$((errors + 1))
                else
                    log_success "개발환경 폴더 확인: $dir"
                fi
            done
            ;;
    esac
    
    # 공통 확인 사항
    if [ ! -d "scripts" ]; then
        log_error "필수 폴더 누락: scripts"
        errors=$((errors + 1))
    else
        log_success "스크립트 폴더 확인: scripts"
    fi
    
    # 기본 파일들 확인
    local basic_files=("package.json" ".gitignore" "README.md")
    for file in "${basic_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_warning "기본 파일 누락: $file"
        else
            log_success "기본 파일 확인: $file"
        fi
    done
    
    # services 폴더 내용 확인
    if [ -d "services" ]; then
        local service_count=$(ls services/ 2>/dev/null | wc -l)
        if [ "$service_count" -eq 0 ]; then
            log_error "services 폴더가 비어있습니다"
            errors=$((errors + 1))
        else
            log_success "services 폴더에 $service_count 개 항목 존재"
        fi
    fi
    
    # Git 상태 확인
    if git status > /dev/null 2>&1; then
        log_success "Git 상태 정상"
    else
        log_error "Git 상태 이상"
        errors=$((errors + 1))
    fi
    
    # 파일 수 검증 (너무 적으면 문제)
    local file_count=$(git ls-files | wc -l)
    if [ "$file_count" -lt 20 ]; then
        log_warning "추적된 파일 수가 적습니다: $file_count 개"
    else
        log_success "적절한 수의 파일 추적됨: $file_count 개"
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "검증 완료 - 모든 항목 정상"
        return 0
    else
        log_error "검증 실패 - $errors 개 오류 발견"
        return 1
    fi
}

# 완전 초기화 및 재설정
force_reset() {
    log_step "완전 초기화 및 재설정 중..."
    
    # 모든 sparse-checkout 설정 제거
    git config core.sparseCheckout false 2>/dev/null || true
    git config --unset core.sparseCheckoutCone 2>/dev/null || true
    rm -f .git/info/sparse-checkout 2>/dev/null || true
    
    # 전체 파일 복원
    git read-tree -m -u HEAD
    log_success "전체 파일 복원 완료"
    
    # 현재 상태 확인
    echo "복원 후 상태:"
    echo "  - 파일 수: $(git ls-files | wc -l)개"
    echo "  - services 폴더: $(ls services/ 2>/dev/null | wc -l)개 항목"
    
    # 재설정 진행
    local server_type=$(detect_server_type)
    log_info "서버 타입 '$server_type'으로 재설정 진행"
    
    apply_selective_sync "$server_type"
}

# 메인 실행 함수
main() {
    echo -e "${CYAN}🔄 O4O 플랫폼 Selective Sync 시작${NC}"
    echo "====================================="
    
    # Git 저장소 확인
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Git 저장소가 아닙니다"
        exit 1
    fi
    
    # 옵션 처리
    local force_reset=false
    local backup_only=false
    local force_legacy=false
    local server_type_override=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force-reset)
                force_reset=true
                shift
                ;;
            --backup-only)
                backup_only=true
                shift
                ;;
            --legacy)
                force_legacy=true
                shift
                ;;
            --server-type)
                server_type_override="$2"
                shift 2
                ;;
            --help|-h)
                cat << 'EOF'
사용법: ./selective-sync.sh [옵션]

옵션:
  --force-reset           강제로 전체 초기화 후 재설정
  --backup-only           백업만 생성하고 종료
  --legacy                구형 Git 방식 강제 사용
  --server-type TYPE      서버 타입 강제 지정 (webserver/apiserver/development)
  -h, --help             이 도움말 표시

서버 타입:
  webserver     웹서버용 (main-site만)
  apiserver     API서버용 (api-server만) 
  development   개발환경용 (전체)

예제:
  ./selective-sync.sh                          # 자동 감지 후 설정
  ./selective-sync.sh --force-reset            # 강제 재설정
  ./selective-sync.sh --server-type webserver  # 웹서버로 강제 설정
  ./selective-sync.sh --legacy                 # 구형 방식 사용
EOF
                exit 0
                ;;
            *)
                log_error "알 수 없는 옵션: $1"
                exit 1
                ;;
        esac
    done
    
    # 1단계: 현재 상태 진단
    diagnose_current_state
    
    # 2단계: 백업 생성
    create_backup
    
    if [ "$backup_only" = true ]; then
        log_success "백업만 생성하고 종료합니다"
        exit 0
    fi
    
    # 서버 타입 결정
    local server_type
    if [ -n "$server_type_override" ]; then
        server_type="$server_type_override"
        log_info "서버 타입 강제 지정: $server_type"
    else
        server_type=$(detect_server_type)
        log_info "자동 감지된 서버 타입: $server_type"
    fi
    
    # 3단계: 강제 리셋 또는 일반 적용
    if [ "$force_reset" = true ]; then
        force_reset
    else
        # 4단계: selective sync 적용
        apply_selective_sync "$server_type" "$force_legacy"
    fi
    
    # 5단계: 검증
    echo ""
    if verify_sync; then
        echo ""
        echo "🎉 Selective Sync 완료!"
        echo "====================================="
        
        # 최종 상태 출력
        echo "📊 최종 상태:"
        echo "  - 서버 타입: $server_type"
        echo "  - Git 버전: $(git --version | cut -d' ' -f3)"
        echo "  - 설정 방식: $([ "$(check_git_version)" = "modern" ] && [ "$force_legacy" != "true" ] && echo "최신 cone mode" || echo "기존 방식")"
        echo "  - 추적 파일: $(git ls-files | wc -l)개"
        
        if [ -d "services" ]; then
            echo "  - Services: $(ls services/ | tr '\n' ' ')"
        fi
        
        # Git 상태 확인
        if git status | grep -q "sparse checkout"; then
            git status | grep "sparse checkout" | head -1 | sed 's/^/  - /'
        fi
        
    else
        log_error "Selective Sync 실패"
        echo ""
        echo "🔧 복구 옵션:"
        echo "  1. 백업 복원: git stash pop"
        echo "  2. 강제 재설정: $0 --force-reset"
        echo "  3. 전체 동기화: git sparse-checkout disable"
        exit 1
    fi
}

# 스크립트 실행
main "$@"
