#!/bin/bash
# health-check.sh
# O4O 플랫폼 시스템 상태 점검 스크립트 (실전 최적화)
# 최종 업데이트: 2025-06-19
# Git 2.34.1 cone mode 반영

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 체크 결과 카운터
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNINGS=0
ERRORS=0
ISSUES=()

# 로그 함수들
log_header() {
    echo -e "${CYAN}🏥 $1${NC}"
    echo "$(printf '%*s' ${#1} | tr ' ' '=')"
}

log_section() {
    echo -e "\n${PURPLE}$1${NC}"
    echo "$(printf '%*s' ${#1} | tr ' ' '-')"
}

log_check() {
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

# 체크 결과 기록
record_check() {
    local status=$1
    local message=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "pass")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            log_check "$message"
            ;;
        "warn")
            WARNINGS=$((WARNINGS + 1))
            log_warning "$message"
            ISSUES+=("WARNING: $message")
            ;;
        "error")
            ERRORS=$((ERRORS + 1))
            log_error "$message"
            ISSUES+=("ERROR: $message")
            ;;
    esac
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
        # services 폴더 기반 감지
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

# Git 저장소 상태 점검
check_git_status() {
    log_section "⚙️ Git 저장소 상태"
    
    # Git 저장소 확인
    if git rev-parse --git-dir > /dev/null 2>&1; then
        record_check "pass" "Git 저장소 인식됨"
        
        # 저장소 경로
        local repo_root=$(git rev-parse --show-toplevel)
        echo "  📁 저장소 경로: $repo_root"
        
        # 현재 브랜치
        local current_branch=$(git branch --show-current 2>/dev/null || echo "detached")
        echo "  🌿 현재 브랜치: $current_branch"
        
        # Git 버전 확인
        local git_version=$(git --version | cut -d' ' -f3)
        echo "  🔧 Git 버전: $git_version"
        
        # Git 2.25+ 확인 (cone mode 지원)
        if [[ $(echo -e "$git_version\n2.25.0" | sort -V | head -1) == "2.25.0" ]]; then
            record_check "pass" "Git 버전 2.25+ (cone mode 지원)"
        else
            record_check "warn" "Git 버전 구형 ($git_version) - cone mode 미지원"
        fi
        
        # 원격 추적 브랜치
        local upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "없음")
        echo "  🔗 업스트림: $upstream"
        
        # 변경사항 확인
        local changes=$(git status --porcelain 2>/dev/null | wc -l)
        if [ "$changes" -eq 0 ]; then
            record_check "pass" "작업 디렉터리 깨끗함"
        else
            record_check "warn" "미커밋 변경사항 $changes 개 존재"
            git status --short | head -5 | sed 's/^/    /'
            if [ "$changes" -gt 5 ]; then
                echo "    ... 외 $((changes - 5))개 더"
            fi
        fi
        
        # 추적된 파일 수
        local tracked_files=$(git ls-files 2>/dev/null | wc -l)
        echo "  📄 추적된 파일: $tracked_files 개"
        
    else
        record_check "error" "Git 저장소가 아닙니다"
        return 1
    fi
}

# Sparse Checkout 설정 점검 (cone mode 우선)
check_sparse_checkout() {
    log_section "⚙️ Sparse Checkout 설정"
    
    local sparse_enabled=$(git config core.sparseCheckout 2>/dev/null || echo "false")
    echo "  🔧 Sparse checkout 상태: $sparse_enabled"
    
    if [ "$sparse_enabled" = "true" ]; then
        # cone mode 확인
        local cone_mode=$(git config core.sparseCheckoutCone 2>/dev/null || echo "false")
        echo "  🔵 Cone mode: $cone_mode"
        
        if [ "$cone_mode" = "true" ]; then
            record_check "pass" "최신 cone mode 사용 중"
            
            # cone mode 패턴 확인
            if command -v git sparse-checkout >/dev/null 2>&1; then
                echo "  📋 설정된 패턴:"
                git sparse-checkout list | sed 's/^/    ✓ /' || echo "    없음"
            fi
        else
            # 기존 방식 확인
            if [ -f .git/info/sparse-checkout ]; then
                local pattern_count=$(wc -l < .git/info/sparse-checkout)
                record_check "warn" "구형 sparse-checkout 사용 ($pattern_count 패턴) - cone mode 권장"
                
                echo "  📋 설정된 패턴 (처음 10개):"
                head -10 .git/info/sparse-checkout | sed 's/^/    /'
                if [ "$pattern_count" -gt 10 ]; then
                    echo "    ... 외 $((pattern_count - 10))개 더"
                fi
            else
                record_check "error" "Sparse checkout이 활성화되었지만 설정이 없음"
            fi
        fi
        
        # 실제 동기화 비율 확인
        if git status | grep -q "sparse checkout"; then
            local sparse_info=$(git status | grep "sparse checkout" | head -1)
            echo "  📊 동기화 상태: $sparse_info"
            record_check "pass" "Sparse checkout 정상 작동 중"
        fi
        
    else
        record_check "pass" "Sparse checkout 비활성화 (전체 동기화)"
    fi
}

# 서버별 디렉터리 구조 점검
check_directory_structure() {
    log_section "📁 디렉터리 구조"
    
    local server_type=$(detect_server_type)
    echo "  🎯 감지된 서버 타입: $server_type"
    
    # 공통 필수 디렉터리
    local common_dirs=("scripts")
    
    # 서버별 필수 디렉터리
    local required_dirs=()
    case $server_type in
        "webserver")
            required_dirs=("services/main-site" "${common_dirs[@]}")
            ;;
        "apiserver") 
            required_dirs=("services/api-server" "${common_dirs[@]}")
            ;;
        "development")
            required_dirs=("services/main-site" "services/api-server" "services/ecommerce" "docs" "${common_dirs[@]}")
            ;;
        *)
            required_dirs=("services" "${common_dirs[@]}")
            ;;
    esac
    
    echo "  🏗️  필수 디렉터리 ($server_type):"
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local count=$(ls "$dir" 2>/dev/null | wc -l)
            record_check "pass" "$dir/ 존재 ($count 항목)"
        else
            record_check "error" "$dir/ 디렉터리 누락"
        fi
    done
    
    # services 디렉터리 상세 점검
    if [ -d "services" ]; then
        echo ""
        echo "  🎯 Services 디렉터리 상세:"
        local services_count=$(ls services/ 2>/dev/null | wc -l)
        
        if [ "$services_count" -gt 0 ]; then
            ls services/ | sed 's/^/    📦 /'
            
            # 서버별 적정성 확인
            case $server_type in
                "webserver")
                    if [ -d "services/main-site" ] && [ ! -d "services/api-server" ]; then
                        record_check "pass" "웹서버용 최적 구성 (main-site만)"
                    elif [ -d "services/api-server" ]; then
                        record_check "warn" "웹서버에 불필요한 api-server 존재"
                    fi
                    ;;
                "apiserver")
                    if [ -d "services/api-server" ] && [ ! -d "services/main-site" ]; then
                        record_check "pass" "API서버용 최적 구성 (api-server만)"
                    elif [ -d "services/main-site" ]; then
                        record_check "warn" "API서버에 불필요한 main-site 존재"
                    fi
                    ;;
            esac
        else
            record_check "error" "services 디렉터리가 비어있음"
        fi
    fi
}

# 제외된 디렉터리 점검
check_excluded_directories() {
    log_section "📊 제외 대상 디렉터리 점검"
    
    local excluded_dirs=("node_modules" ".next" ".nuxt" "dist" "build" "coverage" ".cache")
    local found_excluded=0
    
    for dir in "${excluded_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local size=$(du -sh "$dir" 2>/dev/null | cut -f1 || echo "unknown")
            
            # node_modules는 웹서버에서 필요할 수 있음
            if [ "$dir" = "node_modules" ]; then
                local server_type=$(detect_server_type)
                if [ "$server_type" = "webserver" ]; then
                    # Git 추적 여부 확인
                    local tracked_count=$(git ls-files | grep "node_modules" | wc -l)
                    if [ "$tracked_count" -eq 0 ]; then
                        record_check "pass" "node_modules 존재하지만 git 추적 안 함 ($size)"
                    else
                        record_check "warn" "node_modules가 git에 추적됨 ($tracked_count 파일)"
                    fi
                else
                    record_check "warn" "불필요한 node_modules 존재: $size"
                    found_excluded=$((found_excluded + 1))
                fi
            else
                record_check "warn" "제외 대상 디렉터리 존재: $dir/ ($size)"
                found_excluded=$((found_excluded + 1))
            fi
        fi
    done
    
    if [ $found_excluded -eq 0 ]; then
        record_check "pass" "제외 대상 디렉터리가 깨끗함"
    else
        echo ""
        echo "  💡 정리 명령어:"
        echo "    rm -rf .next .nuxt dist build coverage .cache"
    fi
}

# 파일 시스템 점검
check_filesystem() {
    log_section "📊 파일 시스템 상태"
    
    # 디스크 사용량
    local disk_usage=$(df -h . 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        record_check "pass" "디스크 사용량 정상: ${disk_usage}%"
    elif [ "$disk_usage" -lt 90 ]; then
        record_check "warn" "디스크 사용량 주의: ${disk_usage}%"
    else
        record_check "error" "디스크 사용량 위험: ${disk_usage}%"
    fi
    
    # 현재 디렉터리 크기
    local dir_size=$(du -sh . 2>/dev/null | cut -f1 || echo "unknown")
    echo "  💾 현재 디렉터리 크기: $dir_size"
    
    # 큰 파일 찾기 (10MB 이상)
    local large_files=$(find . -type f -size +10M 2>/dev/null | wc -l)
    if [ "$large_files" -gt 0 ]; then
        record_check "warn" "큰 파일(10MB+) $large_files 개 발견"
        find . -type f -size +10M -exec ls -lh {} \; 2>/dev/null | head -5 | sed 's/^/    /'
    else
        record_check "pass" "큰 파일 없음"
    fi
    
    # Git 객체 크기 (참고용)
    if [ -d ".git/objects" ]; then
        local git_size=$(du -sh .git/objects 2>/dev/null | cut -f1 || echo "unknown")
        echo "  📦 Git 객체 크기: $git_size"
    fi
}

# 네트워크 연결 점검
check_network() {
    log_section "📊 네트워크 연결"
    
    # GitHub 연결 확인
    if ping -c 1 -W 3 github.com > /dev/null 2>&1; then
        record_check "pass" "GitHub 연결 정상"
    else
        record_check "error" "GitHub 연결 실패"
    fi
    
    # Git 원격 저장소 확인
    local remote_url=$(git config --get remote.origin.url 2>/dev/null || echo "")
    if [ -n "$remote_url" ]; then
        echo "  🔗 원격 저장소: $remote_url"
        
        # fetch 테스트 (빠른 확인)
        if timeout 10 git ls-remote origin > /dev/null 2>&1; then
            record_check "pass" "원격 저장소 접근 가능"
        else
            record_check "warn" "원격 저장소 접근 불가 (인증/네트워크 확인)"
        fi
    else
        record_check "warn" "원격 저장소 설정 없음"
    fi
}

# 서버별 맞춤 권장사항
suggest_server_optimization() {
    if [ ${#ISSUES[@]} -eq 0 ]; then
        return
    fi
    
    log_section "🚀 서버별 최적화 권장사항"
    
    local server_type=$(detect_server_type)
    
    echo "  🎯 현재 서버 타입: $server_type"
    echo ""
    
    case $server_type in
        "webserver")
            echo "  🌐 웹서버 최적화:"
            echo "    # main-site만 동기화"
            echo "    git sparse-checkout init --cone"
            echo "    git sparse-checkout set services/main-site scripts"
            echo "    git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md"
            ;;
        "apiserver")
            echo "  🔗 API서버 최적화:"
            echo "    # api-server만 동기화"
            echo "    git sparse-checkout init --cone"  
            echo "    git sparse-checkout set services/api-server scripts"
            echo "    git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md"
            ;;
        "development")
            echo "  🔄 개발환경 설정:"
            echo "    # 전체 동기화 (개발용)"
            echo "    git sparse-checkout disable"
            ;;
        *)
            echo "  ❓ 서버 타입 미확정 - 수동 설정 필요"
            ;;
    esac
    
    echo ""
    
    # 이슈별 맞춤 권장사항
    for issue in "${ISSUES[@]}"; do
        case "$issue" in
            *"sparse-checkout"*|*"디렉터리 누락"*)
                echo "  🔧 동기화 재설정: ./scripts/auto-setup-server.sh"
                ;;
            *"변경사항"*)
                echo "  💾 변경사항 백업: git stash push -m \"health_check_backup_\$(date +%Y%m%d_%H%M%S)\""
                ;;
            *"제외 대상"*)
                echo "  🗑️  불필요한 파일 정리: rm -rf .next dist build coverage .cache"
                ;;
            *"디스크"*)
                echo "  💽 디스크 정리: git gc --aggressive && npm cache clean --force"
                ;;
        esac
    done
}

# 결과 요약
show_summary() {
    log_section "📊 점검 결과 요약"
    
    local pass_rate=0
    if [ $TOTAL_CHECKS -gt 0 ]; then
        pass_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    fi
    
    local server_type=$(detect_server_type)
    
    echo "  🎯 서버 타입: $server_type"
    echo "  📊 전체 점검 항목: $TOTAL_CHECKS"
    echo "  ✅ 통과: $PASSED_CHECKS ($pass_rate%)"
    echo "  ⚠️ 경고: $WARNINGS"
    echo "  ❌ 오류: $ERRORS"
    
    echo ""
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 모든 점검 항목 정상! 서버가 최적 상태입니다.${NC}"
        exit 0
    elif [ $ERRORS -eq 0 ]; then
        echo -e "${YELLOW}⚡ 일부 경고가 있지만 작업 가능합니다.${NC}"
        exit 0
    else
        echo -e "${RED}🚨 심각한 문제가 발견되었습니다. 복구 후 작업하세요.${NC}"
        exit 1
    fi
}

# 메인 실행 함수
main() {
    # 헤더 출력
    log_header "O4O 플랫폼 시스템 상태 점검"
    echo -e "${CYAN}점검 시간: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}점검 위치: $(pwd)${NC}"
    
    # 옵션 처리
    local verbose=false
    local server_type_override=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                verbose=true
                shift
                ;;
            --server-type)
                server_type_override="$2"
                shift 2
                ;;
            --help|-h)
                cat << 'EOF'
사용법: ./health-check.sh [옵션]

옵션:
  -v, --verbose      상세 정보 출력
  --server-type TYPE 서버 타입 강제 지정 (webserver/apiserver/development)
  -h, --help         이 도움말 표시

예제:
  ./health-check.sh                           # 기본 점검
  ./health-check.sh -v                        # 상세 점검
  ./health-check.sh --server-type webserver   # 웹서버로 강제 인식
EOF
                exit 0
                ;;
            *)
                echo "알 수 없는 옵션: $1"
                exit 1
                ;;
        esac
    done
    
    # 점검 실행
    check_git_status
    check_sparse_checkout
    check_directory_structure
    check_excluded_directories
    check_filesystem
    check_network
    
    # 최적화 권장사항
    suggest_server_optimization
    
    # 결과 요약
    show_summary
}

# 스크립트 실행
main "$@"
