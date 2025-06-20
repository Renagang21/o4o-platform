#!/bin/bash
# auto-recovery.sh
# O4O 플랫폼 자동 복구 스크립트 (실제 문제 기반)
# 최종 업데이트: 2025-06-19
# 실전 검증된 문제 해결 방법 적용

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수들
log_header() {
    echo -e "${CYAN}$1${NC}"
    echo "$(printf '%*s' ${#1} | tr ' ' '=')"
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

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

# 전역 변수
RECOVERY_LOG="recovery_$(date +%Y%m%d_%H%M%S).log"
BACKUP_CREATED=false
RECOVERY_STEPS=()
FAILED_STEPS=()

# 복구 단계 기록
record_step() {
    local status=$1
    local step=$2
    local details=${3:-""}
    
    if [ "$status" = "success" ]; then
        RECOVERY_STEPS+=("✅ $step")
        log_success "$step"
    elif [ "$status" = "failure" ]; then
        FAILED_STEPS+=("❌ $step")
        log_error "$step"
    else
        log_info "$step"
    fi
    
    # 로그 파일에 기록
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$status] $step $details" >> "$RECOVERY_LOG"
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
        echo "modern"
    else
        echo "legacy"
    fi
}

# 안전 백업 생성
create_safety_backup() {
    log_step "안전 백업 생성 중..."
    
    local backup_name="auto_recovery_backup_$(date +%Y%m%d_%H%M%S)"
    
    # Git 변경사항 백업
    if git diff --quiet && git diff --cached --quiet; then
        record_step "info" "백업할 Git 변경사항 없음"
    else
        if git stash push -m "$backup_name" 2>/dev/null; then
            record_step "success" "Git 변경사항 백업 생성: $backup_name"
            BACKUP_CREATED=true
            echo "$backup_name" > .last_auto_backup
        else
            record_step "failure" "Git 백업 생성 실패"
            return 1
        fi
    fi
    
    # 현재 sparse-checkout 설정 백업
    if [ "$(git config core.sparseCheckout 2>/dev/null)" = "true" ]; then
        local backup_dir=".git/backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        if [ -f .git/info/sparse-checkout ]; then
            cp .git/info/sparse-checkout "$backup_dir/"
        fi
        
        # cone mode 설정도 백업
        git config core.sparseCheckoutCone > "$backup_dir/sparseCheckoutCone" 2>/dev/null || echo "false" > "$backup_dir/sparseCheckoutCone"
        
        record_step "success" "Sparse-checkout 설정 백업: $backup_dir"
    fi
    
    return 0
}

# 실제 발생한 문제들 감지
detect_real_issues() {
    local issues=()
    
    log_step "실제 문제 감지 중..."
    
    # 1. sparse-checkout 활성화되어 있지만 파일들이 여전히 모두 동기화되는 문제
    local sparse_enabled=$(git config core.sparseCheckout 2>/dev/null || echo "false")
    local tracked_files=$(git ls-files | wc -l)
    
    if [ "$sparse_enabled" = "true" ] && [ "$tracked_files" -gt 300 ]; then
        issues+=("sparse_not_working:$tracked_files")
        record_step "failure" "Sparse-checkout이 활성화되어 있지만 $tracked_files 개 파일이 모두 동기화됨"
    fi
    
    # 2. cone mode 설정이 있지만 실제로는 작동하지 않는 문제  
    local cone_mode=$(git config core.sparseCheckoutCone 2>/dev/null || echo "false")
    if [ "$cone_mode" = "true" ] && [ "$tracked_files" -gt 300 ]; then
        issues+=("cone_mode_broken:$tracked_files")
        record_step "failure" "Cone mode가 설정되어 있지만 작동하지 않음"
    fi
    
    # 3. 서버별 잘못된 폴더 동기화 문제
    local server_type=$(detect_server_type)
    case $server_type in
        "webserver")
            if [ -d "services/api-server" ]; then
                issues+=("wrong_service_webserver")
                record_step "failure" "웹서버에 불필요한 api-server 폴더 존재"
            fi
            if [ ! -d "services/main-site" ]; then
                issues+=("missing_main_site")
                record_step "failure" "웹서버에 필수 main-site 폴더 누락"
            fi
            ;;
        "apiserver")
            if [ -d "services/main-site" ]; then
                issues+=("wrong_service_apiserver")
                record_step "failure" "API서버에 불필요한 main-site 폴더 존재"
            fi
            if [ ! -d "services/api-server" ]; then
                issues+=("missing_api_server")
                record_step "failure" "API서버에 필수 api-server 폴더 누락"
            fi
            ;;
    esac
    
    # 4. sparse-checkout 설정은 있지만 파일이 없는 문제
    if [ "$sparse_enabled" = "true" ] && [ ! -f .git/info/sparse-checkout ] && [ "$cone_mode" != "true" ]; then
        issues+=("sparse_config_missing")
        record_step "failure" "Sparse-checkout이 활성화되었지만 설정 파일이 없음"
    fi
    
    # 5. Git 상태 문제
    if ! git status > /dev/null 2>&1; then
        issues+=("git_status_broken")
        record_step "failure" "Git 상태 명령이 실패함"
    fi
    
    # 6. 필수 디렉터리 누락
    if [ ! -d "scripts" ]; then
        issues+=("scripts_missing")
        record_step "failure" "필수 scripts 디렉터리 누락"
    fi
    
    # 7. 추적 파일 수가 너무 적은 경우
    if [ "$tracked_files" -lt 10 ]; then
        issues+=("too_few_files:$tracked_files")
        record_step "failure" "추적된 파일 수가 너무 적음: $tracked_files 개"
    fi
    
    echo "${issues[@]}"
}

# 실전 검증된 Sparse-checkout 문제 해결
fix_sparse_checkout_issues() {
    log_step "Sparse-checkout 문제 복구 중..."
    
    local server_type=$(detect_server_type)
    local git_version_type=$(check_git_version)
    
    # 1단계: 기존 설정 완전 제거
    git config core.sparseCheckout false 2>/dev/null || true
    git config --unset core.sparseCheckoutCone 2>/dev/null || true
    rm -f .git/info/sparse-checkout 2>/dev/null || true
    
    record_step "success" "기존 sparse-checkout 설정 완전 제거"
    
    # 2단계: 전체 파일 복원
    if git read-tree -m -u HEAD 2>/dev/null; then
        record_step "success" "전체 파일 복원 완료"
    else
        record_step "failure" "전체 파일 복원 실패"
        return 1
    fi
    
    # 3단계: 최신 방식으로 재설정 (Git 2.25+)
    if [ "$git_version_type" = "modern" ]; then
        log_info "최신 cone mode로 재설정 중..."
        
        if git sparse-checkout init --cone 2>/dev/null; then
            record_step "success" "Cone mode 초기화 완료"
            
            # 서버별 설정 적용
            case $server_type in
                "webserver")
                    git sparse-checkout set services/main-site scripts
                    git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md
                    record_step "success" "웹서버용 cone mode 설정 완료"
                    ;;
                "apiserver")
                    git sparse-checkout set services/api-server scripts
                    git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md
                    record_step "success" "API서버용 cone mode 설정 완료"
                    ;;
                *)
                    git sparse-checkout set services scripts
                    git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md
                    record_step "success" "기본 cone mode 설정 완료"
                    ;;
            esac
        else
            record_step "failure" "Cone mode 설정 실패, 기존 방식으로 fallback"
            return 1
        fi
    else
        # 구형 Git을 위한 fallback
        log_info "구형 Git용 기존 방식으로 설정 중..."
        
        git config core.sparseCheckout true
        
        case $server_type in
            "webserver")
                cat > .git/info/sparse-checkout << 'EOF'
services/main-site/
scripts/
package.json
package-lock.json
.env.example
.gitignore
README.md
EOF
                ;;
            "apiserver")
                cat > .git/info/sparse-checkout << 'EOF'
services/api-server/
scripts/
package.json
package-lock.json
.env.example
.gitignore
README.md
EOF
                ;;
            *)
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
        
        git read-tree -m -u HEAD
        record_step "success" "기존 방식 sparse-checkout 설정 완료"
    fi
    
    return 0
}

# 서버별 최적화
optimize_for_server_type() {
    local server_type=$(detect_server_type)
    
    log_step "서버별 최적화 적용 중: $server_type"
    
    case $server_type in
        "webserver")
            # 웹서버에서 불필요한 것들 정리
            if [ -d "services/api-server" ] || [ -d "services/ecommerce" ]; then
                record_step "info" "웹서버에서 불필요한 서비스 폴더들이 제거됨 (sparse-checkout 적용)"
            fi
            
            # 웹개발 관련 파일들이 있는지 확인
            local web_files=("package.json" "tsconfig.json" "next.config.js")
            for file in "${web_files[@]}"; do
                if [ -f "$file" ]; then
                    record_step "success" "웹개발 파일 확인: $file"
                fi
            done
            ;;
            
        "apiserver")
            # API서버에서 불필요한 것들 정리
            if [ -d "services/main-site" ] || [ -d "services/ecommerce" ]; then
                record_step "info" "API서버에서 불필요한 서비스 폴더들이 제거됨 (sparse-checkout 적용)"
            fi
            
            # API 관련 파일들 확인
            local api_files=("package.json" "ecosystem.config.js" "ecosystem.config.cjs")
            for file in "${api_files[@]}"; do
                if [ -f "$file" ]; then
                    record_step "success" "API서버 파일 확인: $file"
                fi
            done
            ;;
    esac
}

# Git 상태 문제 복구
fix_git_issues() {
    log_step "Git 상태 문제 복구 중..."
    
    # Git 저장소 무결성 확인
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        record_step "failure" "Git 저장소가 아님 - 복구 불가"
        return 1
    fi
    
    # HEAD 참조 확인
    if ! git rev-parse HEAD > /dev/null 2>&1; then
        record_step "failure" "HEAD 참조 손상 - 수동 복구 필요"
        return 1
    fi
    
    # 인덱스 문제 해결
    if ! git status > /dev/null 2>&1; then
        log_info "Git 인덱스 복구 시도 중..."
        
        # 인덱스 재생성
        rm -f .git/index 2>/dev/null || true
        if git reset 2>/dev/null; then
            record_step "success" "Git 인덱스 복구 완료"
        else
            record_step "failure" "Git 인덱스 복구 실패"
            return 1
        fi
    fi
    
    # 작업 디렉터리 정리
    if git status --porcelain | grep -q "^??"; then
        local untracked_count=$(git status --porcelain | grep "^??" | wc -l)
        record_step "info" "$untracked_count 개의 추적되지 않는 파일 발견"
    fi
    
    return 0
}

# 파일시스템 문제 복구
fix_filesystem_issues() {
    log_step "파일시스템 문제 복구 중..."
    
    # 불필요한 빌드 결과물 정리
    local cleanup_dirs=(".next" ".nuxt" "dist" "build" "coverage" ".cache")
    local cleaned=0
    
    for dir in "${cleanup_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local size=$(du -sh "$dir" 2>/dev/null | cut -f1 || echo "unknown")
            rm -rf "$dir" 2>/dev/null || true
            if [ ! -d "$dir" ]; then
                record_step "success" "불필요한 디렉터리 제거: $dir ($size)"
                cleaned=$((cleaned + 1))
            fi
        fi
    done
    
    if [ $cleaned -eq 0 ]; then
        record_step "info" "정리할 불필요한 디렉터리 없음"
    fi
    
    # Git 저장소 최적화
    if git gc --auto 2>/dev/null; then
        record_step "success" "Git 저장소 자동 최적화 완료"
    fi
    
    return 0
}

# 복구 후 검증
verify_recovery() {
    log_step "복구 결과 검증 중..."
    
    local verification_passed=true
    local server_type=$(detect_server_type)
    
    # Git 상태 확인
    if git status > /dev/null 2>&1; then
        record_step "success" "Git 상태 정상"
    else
        record_step "failure" "Git 상태 여전히 이상"
        verification_passed=false
    fi
    
    # Sparse-checkout 작동 확인
    local sparse_enabled=$(git config core.sparseCheckout 2>/dev/null || echo "false")
    if [ "$sparse_enabled" = "true" ]; then
        if git status | grep -q "sparse checkout"; then
            record_step "success" "Sparse-checkout 정상 작동"
        else
            record_step "warning" "Sparse-checkout 설정되었지만 상태 메시지 없음"
        fi
    fi
    
    # 서버별 필수 디렉터리 확인
    case $server_type in
        "webserver")
            if [ -d "services/main-site" ]; then
                record_step "success" "웹서버 필수 디렉터리 존재: services/main-site"
            else
                record_step "failure" "웹서버 필수 디렉터리 누락: services/main-site"
                verification_passed=false
            fi
            
            if [ -d "services/api-server" ]; then
                record_step "warning" "웹서버에 불필요한 디렉터리: services/api-server"
            fi
            ;;
            
        "apiserver")
            if [ -d "services/api-server" ]; then
                record_step "success" "API서버 필수 디렉터리 존재: services/api-server"
            else
                record_step "failure" "API서버 필수 디렉터리 누락: services/api-server"
                verification_passed=false
            fi
            
            if [ -d "services/main-site" ]; then
                record_step "warning" "API서버에 불필요한 디렉터리: services/main-site"
            fi
            ;;
    esac
    
    # 공통 필수 디렉터리
    if [ -d "scripts" ]; then
        record_step "success" "필수 디렉터리 존재: scripts"
    else
        record_step "failure" "필수 디렉터리 누락: scripts"
        verification_passed=false
    fi
    
    # 파일 수 합리성 확인
    local file_count=$(git ls-files | wc -l)
    if [ "$file_count" -lt 10 ]; then
        record_step "failure" "추적된 파일 수가 너무 적음: $file_count"
        verification_passed=false
    elif [ "$file_count" -gt 500 ]; then
        record_step "warning" "추적된 파일 수가 많음: $file_count (sparse-checkout 재확인 필요)"
    else
        record_step "success" "적정한 파일 수: $file_count"
    fi
    
    if [ "$verification_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

# 복구 보고서 생성
generate_recovery_report() {
    local report_file="recovery_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# 🚑 자동 복구 보고서

**복구 실행 시간**: $(date '+%Y-%m-%d %H:%M:%S')
**복구 위치**: $(pwd)
**서버 타입**: $(detect_server_type)
**Git 버전**: $(git --version | cut -d' ' -f3)
**복구 로그**: $RECOVERY_LOG

## 📊 복구 결과 요약

- **성공한 단계**: ${#RECOVERY_STEPS[@]}개
- **실패한 단계**: ${#FAILED_STEPS[@]}개
- **백업 생성**: $([ "$BACKUP_CREATED" = true ] && echo "✅ 생성됨" || echo "❌ 생성 안됨")

## 🔧 수행된 복구 단계

EOF

    # 성공한 단계들
    if [ ${#RECOVERY_STEPS[@]} -gt 0 ]; then
        echo "### ✅ 성공한 단계들" >> "$report_file"
        for step in "${RECOVERY_STEPS[@]}"; do
            echo "- $step" >> "$report_file"
        done
        echo "" >> "$report_file"
    fi
    
    # 실패한 단계들
    if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
        echo "### ❌ 실패한 단계들" >> "$report_file"
        for step in "${FAILED_STEPS[@]}"; do
            echo "- $step" >> "$report_file"
        done
        echo "" >> "$report_file"
    fi
    
    # 현재 상태
    cat >> "$report_file" << EOF
## 📊 복구 후 현재 상태

- **Git 상태**: $(git status --porcelain | wc -l) 변경사항
- **추적 파일**: $(git ls-files | wc -l) 개
- **Sparse checkout**: $(git config core.sparseCheckout 2>/dev/null || echo "false")
- **Cone mode**: $(git config core.sparseCheckoutCone 2>/dev/null || echo "false")

### Services 디렉터리
EOF

    if [ -d "services" ]; then
        ls services/ | sed 's/^/- /' >> "$report_file"
    else
        echo "- services 디렉터리 없음" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## 💡 후속 조치 권장사항

EOF

    if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
        cat >> "$report_file" << EOF
### 🚨 즉시 조치 필요
- 실패한 단계들을 수동으로 해결하세요
- 필요시 팀에 도움을 요청하세요
- 백업에서 복원을 고려하세요: \`git stash pop\`

EOF
    fi
    
    cat >> "$report_file" << EOF
### 🔍 추가 점검 항목
- \`./scripts/health-check.sh\` 실행으로 전체 상태 재확인
- 애플리케이션 정상 동작 테스트
- 서버별 맞춤 설정 확인

### 📞 지원 요청
문제가 지속되면 다음 정보와 함께 지원을 요청하세요:
- 이 보고서 파일: \`$report_file\`
- 복구 로그: \`$RECOVERY_LOG\`
- 현재 Git 상태: \`git status\`

---
*자동 생성된 복구 보고서*
EOF

    echo "$report_file"
}

# 메인 실행 함수
main() {
    log_header "🚑 O4O 플랫폼 자동 복구 시스템"
    echo -e "${CYAN}복구 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}서버 환경: $(detect_server_type)${NC}"
    echo -e "${CYAN}Git 버전: $(git --version | cut -d' ' -f3)${NC}"
    
    # 옵션 처리
    local dry_run=false
    local force=false
    local verbose=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --verbose|-v)
                verbose=true
                shift
                ;;
            --help|-h)
                cat << 'EOF'
사용법: ./auto-recovery.sh [옵션]

옵션:
  --dry-run       문제 감지만 하고 복구는 실행하지 않음
  --force         확인 없이 모든 복구 작업 실행
  --verbose       상세 정보 출력
  -h, --help      이 도움말 표시

복구 대상 문제:
  - Sparse-checkout 설정이 작동하지 않는 문제
  - 서버별 잘못된 폴더 동기화 문제
  - Git 상태 이상 문제
  - 파일시스템 정리

예제:
  ./auto-recovery.sh --dry-run     # 문제 감지만
  ./auto-recovery.sh --force       # 자동 복구 실행
  ./auto-recovery.sh --verbose     # 상세 복구
EOF
                exit 0
                ;;
            *)
                log_error "알 수 없는 옵션: $1"
                exit 1
                ;;
        esac
    done
    
    # Git 저장소 확인
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Git 저장소가 아닙니다. 복구를 종료합니다."
        exit 1
    fi
    
    # 1단계: 문제 감지
    log_step "시스템 문제 감지 중..."
    
    local issues=($(detect_real_issues))
    local total_issues=${#issues[@]}
    
    if [ $total_issues -eq 0 ]; then
        log_success "문제가 감지되지 않았습니다. 시스템이 정상 상태입니다."
        exit 0
    fi
    
    log_warning "$total_issues 개의 문제가 감지되었습니다:"
    for issue in "${issues[@]}"; do
        echo "  🔍 $issue"
    done
    
    if [ "$dry_run" = true ]; then
        log_info "Dry-run 모드: 문제만 확인하고 종료합니다."
        exit 0
    fi
    
    # 2단계: 사용자 확인 (force 모드가 아닌 경우)
    if [ "$force" != true ]; then
        echo ""
        log_warning "자동 복구를 진행하면 현재 상태가 변경될 수 있습니다."
        read -p "복구를 진행하시겠습니까? (y/N): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            log_info "사용자가 복구를 취소했습니다."
            exit 0
        fi
    fi
    
    # 3단계: 안전 백업
    if ! create_safety_backup; then
        log_error "안전 백업 생성에 실패했습니다. 복구를 중단합니다."
        exit 1
    fi
    
    # 4단계: 문제별 복구 실행
    local recovery_success=true
    
    # Sparse-checkout 관련 문제들
    local has_sparse_issues=false
    for issue in "${issues[@]}"; do
        case "$issue" in
            sparse_*|cone_mode_*|missing_*|wrong_service_*)
                has_sparse_issues=true
                break
                ;;
        esac
    done
    
    if [ "$has_sparse_issues" = true ]; then
        if ! fix_sparse_checkout_issues; then
            recovery_success=false
        fi
    fi
    
    # Git 상태 문제
    for issue in "${issues[@]}"; do
        case "$issue" in
            git_status_*)
                if ! fix_git_issues; then
                    recovery_success=false
                fi
                break
                ;;
        esac
    done
    
    # 파일시스템 문제
    fix_filesystem_issues
    
    # 서버별 최적화
    optimize_for_server_type
    
    # 5단계: 복구 검증
    if verify_recovery; then
        record_step "success" "복구 검증 통과"
    else
        record_step "failure" "복구 검증 실패"
        recovery_success=false
    fi
    
    # 6단계: 보고서 생성
    local report_file=$(generate_recovery_report)
    
    # 최종 결과
    echo ""
    if [ "$recovery_success" = true ]; then
        log_success "🎉 자동 복구가 성공적으로 완료되었습니다!"
        log_info "복구 보고서: $report_file"
        log_info "복구 로그: $RECOVERY_LOG"
        
        # 최종 상태 출력
        echo ""
        echo "📊 복구 후 최종 상태:"
        echo "  - 서버 타입: $(detect_server_type)"
        echo "  - 추적 파일: $(git ls-files | wc -l) 개"
        echo "  - Services: $(ls services/ 2>/dev/null | tr '\n' ' ' || echo '없음')"
        if git status | grep -q "sparse checkout"; then
            git status | grep "sparse checkout" | head -1 | sed 's/^/  - /'
        fi
        
        exit 0
    else
        log_error "❌ 자동 복구가 부분적으로 실패했습니다."
        log_info "복구 보고서: $report_file"
        log_info "복구 로그: $RECOVERY_LOG"
        
        if [ "$BACKUP_CREATED" = true ]; then
            log_warning "필요시 백업에서 복원: git stash pop"
        fi
        
        echo ""
        echo "🔧 수동 복구 옵션:"
        echo "  1. 백업 복원: git stash pop"
        echo "  2. 완전 초기화: git sparse-checkout disable"
        echo "  3. 강제 재설정: ./scripts/selective-sync.sh --force-reset"
        echo "  4. 상태 점검: ./scripts/health-check.sh"
        
        exit 1
    fi
}

# 스크립트 실행
main "$@"
