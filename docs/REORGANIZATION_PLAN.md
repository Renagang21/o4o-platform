# O4O Platform docs/ 폴더 정비 계획서

> **작성일**: 2025-10-31
> **목적**: docs 폴더 구조 개선 및 문서 정리 전략 수립
> **현재 상태**: 24개 폴더, 104개 파일 (산재 및 중복 존재)

---

## 📊 현황 분석

### 1. 문제점 진단

#### 문제 1: 폴더 구조 혼재 ❌
```
현재 24개 폴더 존재:
├── docs/ (루트에 11개 파일 산재)
├── ai/ (AI 참조용)
├── api-analysis/ (API 분석)
├── apps/ (앱 가이드)
├── architecture/ (아키텍처)
│   └── blocks/ (블록 하위)
├── authentication/ (인증)
├── decisions/ (아키텍처 결정)
├── deployment/ (배포)
├── development/ (개발)
│   └── legacy/ (빈 폴더 ⚠️)
├── development-reference/ (개발 참조)
│   ├── architecture/ (빈 폴더 ⚠️)
│   ├── implementation/ (빈 폴더 ⚠️)
│   ├── lessons-learned/ (빈 폴더 ⚠️)
│   ├── process/ (빈 폴더 ⚠️)
│   └── tech-stack/ (빈 폴더 ⚠️)
├── manual/ (사용자 매뉴얼 - 19개 파일)
├── marketing/ (마케팅)
├── operations/ (운영)
├── reference/ (참조)
├── setup/ (설치)
├── testing/ (테스트)
└── troubleshooting/ (문제 해결)
```

**문제:**
- ✗ 폴더가 너무 많아 탐색 어려움 (24개)
- ✗ 빈 폴더 6개 존재 (development-reference 하위)
- ✗ 역할이 겹치는 폴더 존재 (development, development-reference, setup, deployment)
- ✗ 루트에 파일 11개 산재 (BLOCKS_DEVELOPMENT.md, DEPLOYMENT.md 등)

#### 문제 2: 문서 중복 및 버전 혼재 ❌
```
중복 문서:
1. AI 페이지 생성 가이드 (3개)
   - docs/manual/AI_PAGE_GENERATION_GUIDE.md (1417줄, 최신 ✅)
   - docs/manual/ai-page-generation.md (508줄, 구버전 ⚠️)
   - docs/manual/ai-user-guide.md (351줄, 일부만)
   - docs/manual/ai-technical-guide.md (762줄, 일부만)

2. CHANGELOG (2개)
   - docs/manual/CHANGELOG.md (102줄)
   - /CHANGELOG.md (3754줄, 메인 ✅)

3. 배포 가이드 (2개)
   - docs/DEPLOYMENT.md (루트)
   - docs/deployment/README.md (폴더 내)

4. 빠른 시작 가이드 (2개)
   - docs/QUICK_START.md (루트)
   - docs/reference/QUICK_REFERENCE.md
```

**문제:**
- ✗ 어떤 버전이 최신인지 불명확
- ✗ 유지보수 부담 (하나 수정 시 여러 곳 수정 필요)
- ✗ 사용자 혼란 (어떤 문서를 봐야 할지 모름)

#### 문제 3: 폴더 간 역할 불명확 ❌
```
혼란스러운 폴더 관계:
- development/ vs development-reference/ vs setup/
- deployment/ vs setup/
- apps/ vs manual/
- architecture/ vs architecture/blocks/
- reference/ vs manual/
```

#### 문제 4: 파일 명명 규칙 혼재 ❌
```
대문자 vs 소문자:
- UPPER_CASE.md (API_DOCUMENTATION.md)
- kebab-case.md (authentication-integration.md)
- PascalCase.md (없음)

일관성 없음:
- BLOCKS_DEVELOPMENT.md (루트)
- blocks-reference.md (manual/)
```

---

## 🎯 목표 설정

### 1차 목표: 폴더 구조 단순화
```
24개 폴더 → 12개 폴더 (50% 감소)
```

### 2차 목표: 중복 문서 제거
```
104개 파일 → 85-90개 파일 (15-20% 감소)
```

### 3차 목표: 역할 명확화
```
각 폴더의 명확한 목적 정의
README.md로 폴더별 안내
```

### 4차 목표: 일관된 명명 규칙
```
모든 파일명: kebab-case.md (소문자-하이픈)
예외: README.md, CHANGELOG.md (관례)
```

---

## 📐 새로운 폴더 구조 (제안)

### Option A: 사용자 중심 구조 (권장) ⭐

```
docs/
├── README.md                          # 전체 가이드
│
├── guides/                            # 📖 사용자 가이드
│   ├── README.md
│   ├── getting-started/               # 시작하기
│   │   ├── quick-start.md
│   │   ├── local-setup.md
│   │   └── environment-setup.md
│   ├── user-manuals/                  # 사용자 매뉴얼
│   │   ├── admin-manual.md
│   │   ├── editor-manual.md
│   │   ├── dropshipping-manual.md
│   │   ├── seller-manual.md
│   │   └── supplier-manual.md
│   ├── features/                      # 기능별 가이드
│   │   ├── blocks-reference.md        # 블록 레퍼런스
│   │   ├── shortcodes-reference.md    # 숏코드 레퍼런스
│   │   ├── ai-page-generation.md      # AI 페이지 생성 통합 가이드
│   │   ├── appearance-customize.md
│   │   ├── appearance-menus.md
│   │   └── appearance-template-parts.md
│   └── roles/                         # 역할별 가이드
│       ├── role-personalization.md
│       └── menu-role-application.md
│
├── development/                       # 💻 개발자 문서
│   ├── README.md
│   ├── getting-started/
│   │   ├── local-development.md
│   │   ├── npm-scripts.md
│   │   └── development-commands.md
│   ├── architecture/                  # 아키텍처
│   │   ├── system-overview.md
│   │   ├── api-server-requirements.md
│   │   ├── page-management.md
│   │   ├── editor-data-storage.md
│   │   └── wordpress-theme-analysis.md
│   ├── blocks/                        # 블록 시스템
│   │   ├── blocks-development.md      # ← 루트에서 이동
│   │   ├── block-architecture.md
│   │   ├── block-implementation-status.md
│   │   ├── block-optimization.md
│   │   ├── block-migration-roadmap.md
│   │   ├── block-audit-report.md
│   │   ├── dynamic-blocks-architecture.md
│   │   ├── form-solution-analysis.md
│   │   └── template-editor-verification.md
│   ├── authentication/                # 인증 시스템
│   │   ├── README.md
│   │   ├── authentication-integration.md
│   │   ├── oauth-integration.md
│   │   ├── refresh-token.md
│   │   ├── session-management.md
│   │   ├── login-security.md
│   │   ├── password-reset.md
│   │   └── cross-app-session-sync.md
│   ├── api/                           # API 문서
│   │   ├── api-documentation.md
│   │   ├── api-error-analysis.md
│   │   ├── api-server-fix.md
│   │   └── api-safety-guide.md
│   ├── guidelines/                    # 개발 가이드라인
│   │   ├── development-guidelines.md
│   │   ├── architecture-decisions.md
│   │   ├── development-process.md
│   │   └── implementation-challenges.md
│   ├── database/                      # 데이터베이스
│   │   ├── jsonb-optimization.md
│   │   └── idempotency-constraint.md
│   ├── payment/                       # 결제 시스템
│   │   ├── payment-gateway-design.md
│   │   └── payment-setup.md
│   └── specialized/                   # 특수 기능
│       ├── conversational-editor.md   # AI 대화형 에디터
│       └── role-based-navigation.md
│
├── deployment/                        # 🚀 배포 및 운영
│   ├── README.md                      # 배포 마스터 가이드
│   ├── setup/                         # 초기 설정
│   │   ├── server-setup.md
│   │   ├── database-setup.md
│   │   ├── nginx-setup.md
│   │   ├── dns-configuration.md
│   │   ├── github-actions-setup.md
│   │   ├── github-secrets.md
│   │   └── pm2-autostart.md
│   ├── environments/                  # 환경별 설정
│   │   ├── env-setup.md
│   │   ├── env-variables-design.md
│   │   ├── api-server-env.md
│   │   └── webserver-env.md
│   ├── operations/                    # 운영
│   │   ├── server-access.md
│   │   ├── product-import.md
│   │   ├── webserver-no-build.md
│   │   └── claude-webserver.md
│   └── monitoring/                    # 모니터링
│       └── health-checks.md
│
├── troubleshooting/                   # 🔧 문제 해결
│   ├── README.md
│   ├── common-issues/
│   │   ├── 502-bad-gateway.md
│   │   ├── api-cors-fix.md
│   │   └── header-setup.md
│   ├── recovery/
│   │   ├── disaster-recovery-runbook.md
│   │   └── api-server-recovery.md
│   └── fixes/
│       └── dependency-fix-summary.md
│
├── testing/                           # 🧪 테스트
│   ├── README.md
│   ├── test-guide.md
│   ├── dropshipping-test-checklist.md
│   └── slideapp-qa-checklist.md
│
├── ai/                                # 🤖 AI 참조 (AI 어시스턴트용)
│   ├── README.md
│   ├── block-reference-system.md
│   └── dynamic-reference-summary.md
│
├── marketing/                         # 📢 마케팅 자료
│   ├── intro-overview.md
│   └── partner-overview.md
│
├── decisions/                         # 📋 의사결정 기록 (ADR)
│   └── 2025-10-21-architecture-decisions.md
│
└── archive/                           # 📦 보관 (참고용)
    ├── legacy-deployment/
    ├── legacy-investigation/
    └── deprecated-docs/

총 12개 폴더 (24개 → 12개, 50% 감소)
```

### Option B: 기술 중심 구조 (대안)

```
docs/
├── user-guides/           # 사용자 문서
├── developer-guides/      # 개발자 문서
├── architecture/          # 아키텍처
├── deployment/            # 배포
├── operations/            # 운영
├── troubleshooting/       # 문제 해결
├── testing/               # 테스트
├── ai-reference/          # AI 참조
├── marketing/             # 마케팅
├── decisions/             # 의사결정
└── archive/               # 보관

총 11개 폴더
```

---

## 🔄 마이그레이션 계획 (Option A 기준)

### Phase 1: 폴더 생성 및 빈 폴더 제거 (1일)

#### 1-1. 새 폴더 구조 생성
```bash
mkdir -p docs/guides/{getting-started,user-manuals,features,roles}
mkdir -p docs/development/{getting-started,architecture,blocks,authentication,api,guidelines,database,payment,specialized}
mkdir -p docs/deployment/{setup,environments,operations,monitoring}
mkdir -p docs/troubleshooting/{common-issues,recovery,fixes}
mkdir -p docs/archive/{legacy-deployment,legacy-investigation,deprecated-docs}
```

#### 1-2. 빈 폴더 삭제
```bash
# 빈 폴더 6개 삭제
rm -rf docs/development-reference/architecture
rm -rf docs/development-reference/implementation
rm -rf docs/development-reference/lessons-learned
rm -rf docs/development-reference/process
rm -rf docs/development-reference/tech-stack
rm -rf docs/development/legacy
```

### Phase 2: 파일 이동 (2일)

#### 2-1. guides/ 폴더로 이동

**getting-started/**:
```bash
mv docs/QUICK_START.md docs/guides/getting-started/quick-start.md
mv docs/development/LOCAL_SETUP_GUIDE.md docs/guides/getting-started/local-setup.md
mv docs/deployment/ENV_SETUP.md docs/guides/getting-started/environment-setup.md
```

**user-manuals/**:
```bash
mv docs/manual/admin-manual.md docs/guides/user-manuals/admin-manual.md
mv docs/manual/editor-usage-manual.md docs/guides/user-manuals/editor-manual.md
mv docs/manual/dropshipping-user-manual.md docs/guides/user-manuals/dropshipping-manual.md
mv docs/manual/seller-manual.md docs/guides/user-manuals/seller-manual.md
mv docs/manual/supplier-manual.md docs/guides/user-manuals/supplier-manual.md
```

**features/**:
```bash
mv docs/manual/BLOCKS_REFERENCE.md docs/guides/features/blocks-reference.md
mv docs/manual/SHORTCODES.md docs/guides/features/shortcodes-reference.md
mv docs/manual/AI_PAGE_GENERATION_GUIDE.md docs/guides/features/ai-page-generation.md
mv docs/manual/appearance-customize.md docs/guides/features/appearance-customize.md
mv docs/manual/appearance-menus.md docs/guides/features/appearance-menus.md
mv docs/manual/appearance-template-parts.md docs/guides/features/appearance-template-parts.md
```

**roles/**:
```bash
mv docs/manual/role-personalization-admin.md docs/guides/roles/role-personalization.md
mv docs/manual/menu-role-application.md docs/guides/roles/menu-role-application.md
```

#### 2-2. development/ 폴더로 이동

**getting-started/**:
```bash
mv docs/development/LOCAL_DEV_COMMANDS.md docs/development/getting-started/development-commands.md
mv docs/development/NPM_SCRIPTS_GUIDE.md docs/development/getting-started/npm-scripts.md
```

**architecture/**:
```bash
mv docs/architecture/API_SERVER_REQUIREMENTS.md docs/development/architecture/api-server-requirements.md
mv docs/architecture/PAGE_MANAGEMENT_IMPLEMENTATION_GUIDE.md docs/development/architecture/page-management.md
mv docs/architecture/EDITOR_DATA_STORAGE_ANALYSIS.md docs/development/architecture/editor-data-storage.md
mv docs/architecture/WORDPRESS_THEME_ANALYSIS_REPORT.md docs/development/architecture/wordpress-theme-analysis.md
```

**blocks/**:
```bash
mv docs/BLOCKS_DEVELOPMENT.md docs/development/blocks/blocks-development.md
mv docs/architecture/blocks/BLOCK_PLUGIN_ARCHITECTURE.md docs/development/blocks/block-architecture.md
mv docs/architecture/blocks/BLOCK_IMPLEMENTATION_STATUS.md docs/development/blocks/block-implementation-status.md
mv docs/architecture/blocks/BLOCK_BUNDLE_OPTIMIZATION_STRATEGY.md docs/development/blocks/block-optimization.md
mv docs/architecture/blocks/BLOCK_PLUGIN_MIGRATION_ROADMAP.md docs/development/blocks/block-migration-roadmap.md
mv docs/architecture/blocks/BLOCK_SYSTEM_AUDIT_REPORT.md docs/development/blocks/block-audit-report.md
mv docs/architecture/DYNAMIC_BLOCKS_ARCHITECTURE_ANALYSIS.md docs/development/blocks/dynamic-blocks-architecture.md
mv docs/architecture/FORM_SOLUTION_ANALYSIS.md docs/development/blocks/form-solution-analysis.md
mv docs/architecture/TEMPLATE_EDITOR_VERIFICATION.md docs/development/blocks/template-editor-verification.md
```

**authentication/**:
```bash
mv docs/authentication/* docs/development/authentication/
```

**api/**:
```bash
mv docs/api-analysis/API_DOCUMENTATION.md docs/development/api/api-documentation.md
mv docs/api-analysis/API_ERROR_ANALYSIS_REPORT.md docs/development/api/api-error-analysis.md
mv docs/api-analysis/API_SERVER_FIX_INSTRUCTIONS.md docs/development/api/api-server-fix.md
mv docs/apps/API_SAFETY_GUIDE.md docs/development/api/api-safety-guide.md
```

**guidelines/**:
```bash
mv docs/development/DEVELOPMENT_GUIDELINES.md docs/development/guidelines/development-guidelines.md
mv docs/development-reference/ARCHITECTURE_DECISIONS.md docs/development/guidelines/architecture-decisions.md
mv docs/development-reference/DEVELOPMENT_PROCESS_COMPLETE.md docs/development/guidelines/development-process.md
mv docs/development-reference/IMPLEMENTATION_CHALLENGES.md docs/development/guidelines/implementation-challenges.md
```

**database/**:
```bash
mv docs/JSONB_OPTIMIZATION_STRATEGY.md docs/development/database/jsonb-optimization.md
mv docs/IDEMPOTENCY_CONSTRAINT_MANUAL.md docs/development/database/idempotency-constraint.md
```

**payment/**:
```bash
mv docs/PAYMENT_GATEWAY_DESIGN.md docs/development/payment/payment-gateway-design.md
mv docs/PAYMENT_SETUP.md docs/development/payment/payment-setup.md
```

**specialized/**:
```bash
mv docs/AI_CONVERSATIONAL_EDITOR_GUIDE.md docs/development/specialized/conversational-editor.md
mv docs/ROLE_BASED_NAVIGATION.md docs/development/specialized/role-based-navigation.md
mv docs/ROLE_PERSONALIZATION.md docs/development/specialized/role-personalization.md
```

#### 2-3. deployment/ 폴더 재구성

**setup/**:
```bash
mv docs/deployment/SERVER_SETUP_GUIDE.md docs/deployment/setup/server-setup.md
mv docs/deployment/DATABASE_SETUP_GUIDE.md docs/deployment/setup/database-setup.md
mv docs/deployment/nginx-setup.md docs/deployment/setup/nginx-setup.md
mv docs/deployment/DNS_CONFIGURATION_GUIDE.md docs/deployment/setup/dns-configuration.md
mv docs/deployment/GITHUB_ACTIONS_SETUP.md docs/deployment/setup/github-actions-setup.md
mv docs/setup/SETUP_GITHUB_SECRETS.md docs/deployment/setup/github-secrets.md
mv docs/setup/PM2_AUTOSTART_SETUP-webserver.md docs/deployment/setup/pm2-autostart.md
```

**environments/**:
```bash
mv docs/setup/ENV_VARIABLES_DESIGN.md docs/deployment/environments/env-variables-design.md
mv docs/setup/API_SERVER_ENV_REQUIREMENTS.md docs/deployment/environments/api-server-env.md
mv docs/setup/WEBSERVER_ENV_REQUIREMENTS.md docs/deployment/environments/webserver-env.md
mv docs/setup/API_SERVER_SETUP_GUIDE.md docs/deployment/environments/api-server-setup.md
mv docs/setup/HEADER_SETUP_GUIDE.md docs/deployment/environments/header-setup.md
```

**operations/**:
```bash
mv docs/operations/SERVER_ACCESS.md docs/deployment/operations/server-access.md
mv docs/operations/PRODUCT_IMPORT_GUIDE.md docs/deployment/operations/product-import.md
mv docs/operations/WEBSERVER_NO_BUILD_GUIDE.md docs/deployment/operations/webserver-no-build.md
mv docs/operations/CLAUDE_WEBSERVER.md docs/deployment/operations/claude-webserver.md
```

#### 2-4. troubleshooting/ 폴더 재구성

**common-issues/**:
```bash
mv docs/troubleshooting/502-BAD-GATEWAY-SOLUTIONS.md docs/troubleshooting/common-issues/502-bad-gateway.md
mv docs/troubleshooting/API_CORS_FIX_GUIDE.md docs/troubleshooting/common-issues/api-cors-fix.md
```

**recovery/**:
```bash
mv docs/troubleshooting/DISASTER_RECOVERY_RUNBOOK.md docs/troubleshooting/recovery/disaster-recovery-runbook.md
mv docs/troubleshooting/API_SERVER_RECOVERY_PLAN.md docs/troubleshooting/recovery/api-server-recovery.md
```

**fixes/**:
```bash
mv docs/development/DEPENDENCY_FIX_SUMMARY.md docs/troubleshooting/fixes/dependency-fix-summary.md
```

### Phase 3: 중복 문서 처리 (1일)

#### 3-1. 병합 및 삭제

**AI 페이지 생성 가이드** (4개 → 1개):
```bash
# 최신 통합 가이드 유지
# docs/guides/features/ai-page-generation.md (AI_PAGE_GENERATION_GUIDE.md 이동한 것)

# 구버전 3개 삭제
rm docs/manual/ai-page-generation.md         # 구버전
rm docs/manual/ai-user-guide.md              # 일부만 (통합 가이드에 포함됨)
rm docs/manual/ai-technical-guide.md         # 일부만 (통합 가이드에 포함됨)
```

**CHANGELOG** (2개 → 1개):
```bash
# 루트 CHANGELOG.md 유지 (메인 버전)
rm docs/manual/CHANGELOG.md  # 삭제 (중복)
```

**배포 가이드** (2개 → 1개):
```bash
# docs/deployment/README.md 유지 (마스터 가이드)
rm docs/DEPLOYMENT.md  # 루트에서 삭제 (중복)
```

**빠른 시작 가이드** (2개 → 1개):
```bash
# docs/guides/getting-started/quick-start.md 유지
rm docs/reference/QUICK_REFERENCE.md  # 내용 병합 후 삭제
```

#### 3-2. apps/ 폴더 통합

```bash
# apps/ 폴더의 가이드를 적절한 위치로 이동
mv docs/apps/ADMIN_MENU_GUIDE.md docs/guides/user-manuals/admin-menu-guide.md
mv docs/apps/ROUTING_GUIDE.md docs/development/guidelines/routing-guide.md
mv docs/apps/SCREEN_OPTIONS_GUIDE.md docs/guides/user-manuals/screen-options-guide.md
mv docs/apps/USER_MANUAL_KO.md docs/guides/user-manuals/user-manual-ko.md
mv docs/apps/GALLERY_BLOCK_API_REQUIREMENTS.md docs/development/blocks/gallery-block-api.md

# apps/ 폴더 삭제
rm -rf docs/apps
```

### Phase 4: 파일명 정규화 (1일)

#### 4-1. kebab-case로 변환

모든 파일을 소문자-하이픈 형태로 변환 (README.md, CHANGELOG.md 제외):

```bash
# 예시:
# API_DOCUMENTATION.md → api-documentation.md
# BLOCKS_DEVELOPMENT.md → blocks-development.md
# 등등...

# 자동 변환 스크립트 (참고)
find docs -name "*.md" -type f | while read file; do
  dir=$(dirname "$file")
  base=$(basename "$file")
  if [[ "$base" != "README.md" && "$base" != "CHANGELOG.md" ]]; then
    new_name=$(echo "$base" | sed 's/_/-/g' | tr '[:upper:]' '[:lower:]')
    if [[ "$base" != "$new_name" ]]; then
      mv "$file" "$dir/$new_name"
    fi
  fi
done
```

### Phase 5: README.md 작성 (2일)

각 폴더마다 README.md 생성:

#### 5-1. 주요 README 작성

**docs/guides/README.md**:
```markdown
# 사용자 가이드

O4O 플랫폼 사용자를 위한 가이드 모음

## 시작하기
- [빠른 시작](./getting-started/quick-start.md)
- [로컬 설정](./getting-started/local-setup.md)
- [환경 설정](./getting-started/environment-setup.md)

## 사용자 매뉴얼
- [관리자 매뉴얼](./user-manuals/admin-manual.md)
- [편집기 매뉴얼](./user-manuals/editor-manual.md)
- [드롭쉬핑 매뉴얼](./user-manuals/dropshipping-manual.md)
...
```

**docs/development/README.md**:
```markdown
# 개발자 문서

O4O 플랫폼 개발을 위한 기술 문서

## 시작하기
- [로컬 개발 환경](./getting-started/local-development.md)
- [NPM 스크립트](./getting-started/npm-scripts.md)
- [개발 명령어](./getting-started/development-commands.md)

## 아키텍처
- [시스템 개요](./architecture/system-overview.md)
...
```

**docs/deployment/README.md**:
```markdown
# 배포 가이드

O4O 플랫폼 배포 및 운영 가이드

## 초기 설정
- [서버 설정](./setup/server-setup.md)
- [데이터베이스 설정](./setup/database-setup.md)
...
```

### Phase 6: 링크 업데이트 (1일)

#### 6-1. 내부 링크 수정

모든 문서의 내부 링크를 새 경로로 업데이트:

```bash
# 예시:
# [배포 가이드](../deployment/README.md)
# → [배포 가이드](../../deployment/README.md)

# 자동 링크 검사 (참고)
grep -r "\[.*\](.*\.md)" docs/ | grep -v "http"
```

#### 6-2. 루트 README.md 업데이트

`docs/README.md`를 새 구조에 맞게 전면 재작성

### Phase 7: 빈 폴더 정리 (1일)

마이그레이션 후 비어있는 폴더 삭제:

```bash
# 빈 폴더 찾기
find docs -type d -empty

# 빈 폴더 삭제
find docs -type d -empty -delete
```

---

## 📋 체크리스트

### Pre-Migration (준비 단계)
- [ ] 현재 docs 폴더 전체 백업
  ```bash
  cp -r docs docs.backup.$(date +%Y%m%d)
  ```
- [ ] Git 커밋 상태 확인 (깨끗한 working tree)
- [ ] 팀원에게 마이그레이션 계획 공유
- [ ] 마이그레이션 일정 조율 (개발 중단 시간 최소화)

### Migration (마이그레이션)
- [ ] Phase 1: 폴더 생성 및 빈 폴더 제거
- [ ] Phase 2: 파일 이동
  - [ ] 2-1. guides/ 폴더
  - [ ] 2-2. development/ 폴더
  - [ ] 2-3. deployment/ 폴더
  - [ ] 2-4. troubleshooting/ 폴더
- [ ] Phase 3: 중복 문서 처리
  - [ ] 3-1. 병합 및 삭제
  - [ ] 3-2. apps/ 폴더 통합
- [ ] Phase 4: 파일명 정규화
- [ ] Phase 5: README.md 작성
  - [ ] docs/guides/README.md
  - [ ] docs/development/README.md
  - [ ] docs/deployment/README.md
  - [ ] docs/troubleshooting/README.md
  - [ ] docs/testing/README.md
- [ ] Phase 6: 링크 업데이트
  - [ ] 내부 링크 수정
  - [ ] 루트 README.md 재작성
- [ ] Phase 7: 빈 폴더 정리

### Post-Migration (마이그레이션 후)
- [ ] 모든 링크 테스트 (404 체크)
- [ ] 문서 렌더링 확인 (마크다운 에디터)
- [ ] Git 커밋
  ```bash
  git add docs/
  git commit -m "docs: reorganize documentation structure

  - Reduce folders from 24 to 12 (50% reduction)
  - Remove duplicate documents (AI guides, CHANGELOG)
  - Normalize file names to kebab-case
  - Add README.md to all major folders
  - Update internal links to new paths"
  ```
- [ ] 팀원에게 새 구조 안내
- [ ] 백업 폴더 보관 (1주일 후 삭제)

---

## 🔍 검증 방법

### 1. 폴더 수 검증
```bash
# Before: 24개
find docs -type d | wc -l

# After: 12개 (예상)
find docs -type d | wc -l
```

### 2. 파일 수 검증
```bash
# Before: 104개
find docs -name "*.md" | wc -l

# After: 85-90개 (예상, 15-20% 감소)
find docs -name "*.md" | wc -l
```

### 3. 빈 폴더 검증
```bash
# 0개여야 함
find docs -type d -empty | wc -l
```

### 4. 중복 파일 검증
```bash
# AI 가이드 중복 체크 (1개만 존재해야 함)
find docs -name "*ai*page*generation*" -o -name "*ai*user*guide*" -o -name "*ai*technical*guide*"

# CHANGELOG 중복 체크 (루트만 존재)
find docs -name "CHANGELOG.md"
```

### 5. 링크 검증
```bash
# 깨진 링크 찾기 (404)
# TODO: 자동 링크 검사 스크립트 작성
```

---

## ⚠️ 리스크 및 완화 방안

### 리스크 1: 기존 링크 깨짐
**영향**: 외부 문서나 북마크에서 접근 불가
**완화**:
- 리다이렉트 맵 생성
- 주요 문서는 루트에 심볼릭 링크 유지 (임시)
  ```bash
  ln -s guides/features/blocks-reference.md docs/BLOCKS_REFERENCE.md
  ```

### 리스크 2: 팀원 혼란
**영향**: 새 구조에 적응 시간 필요
**완화**:
- 마이그레이션 가이드 작성
- Slack/이메일로 공지
- 1주일 grace period (구버전 병행 유지)

### 리스크 3: 자동화 도구 영향
**영향**: CI/CD, 문서 생성 스크립트 등이 깨질 수 있음
**완화**:
- 마이그레이션 전 자동화 도구 목록 작성
- 각 도구의 경로 설정 업데이트
- 테스트 실행으로 검증

---

## 📊 예상 효과

### 정량적 효과
- **폴더 수 감소**: 24개 → 12개 (50% ↓)
- **파일 수 감소**: 104개 → 85-90개 (15-20% ↓)
- **빈 폴더 제거**: 6개 → 0개
- **중복 문서 제거**: 10개 이상

### 정성적 효과
- ✅ **탐색성 향상**: 폴더가 절반으로 줄어 빠른 탐색 가능
- ✅ **일관성 확보**: kebab-case 명명 규칙 통일
- ✅ **역할 명확화**: guides (사용자), development (개발자), deployment (운영자)
- ✅ **유지보수 개선**: 중복 제거로 업데이트 부담 감소
- ✅ **신규 합류자 친화적**: README.md로 명확한 가이드 제공

---

## 📅 일정 (7일 계획)

| 일차 | 작업 | 시간 | 담당 |
|------|------|------|------|
| Day 1 | Phase 1: 폴더 생성, 빈 폴더 제거 | 2시간 | 개발자 A |
| Day 2 | Phase 2-1: guides/ 파일 이동 | 3시간 | 개발자 A |
| Day 3 | Phase 2-2,3,4: development/deployment/troubleshooting 이동 | 4시간 | 개발자 A |
| Day 4 | Phase 3: 중복 문서 처리 | 3시간 | 개발자 B |
| Day 5 | Phase 4: 파일명 정규화 | 2시간 | 개발자 A |
| Day 6 | Phase 5: README.md 작성 | 4시간 | 개발자 B |
| Day 7 | Phase 6,7: 링크 업데이트, 정리 | 3시간 | 개발자 A+B |
| **총** | **7일** | **21시간** | **2명** |

---

## 🎯 최종 의사 결정

### 권장 사항: Option A (사용자 중심 구조) 채택

**이유:**
1. ✅ 사용자가 찾기 쉬움 (guides/ → features/)
2. ✅ 개발자 문서와 명확히 분리 (development/)
3. ✅ 운영자 문서 통합 (deployment/)
4. ✅ 50% 폴더 감소로 탐색성 향상
5. ✅ 15-20% 파일 감소로 유지보수 부담 감소

### 실행 시점
- **권장**: 다음 스프린트 시작 전 (개발 중단 최소화)
- **필수 준비**: Git 백업, 팀 공지, CI/CD 경로 업데이트 목록 작성

### 승인 필요
- [ ] 기술 리더 승인
- [ ] 팀 동의 (투표 또는 회의)
- [ ] 일정 확정

---

**작성자**: Claude Code (AI Assistant)
**검토 필요**: O4O Platform Team
**최종 업데이트**: 2025-10-31
