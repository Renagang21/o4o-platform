# Claude 작업 규칙

> O4O Platform 개발 시 Claude Code가 반드시 따라야 하는 규칙

---

## 1. 브랜치 전략

| 브랜치 | 용도 | 배포 |
|--------|------|------|
| `develop` | 일상 개발 & 테스트 | dev-admin.neture.co.kr |
| `main` | 프로덕션 안정 | admin.neture.co.kr |
| `feature/*` | 기능별 개발 (선택) | - |

```bash
# 작업 시작
git checkout develop && git pull origin develop

# 개발 환경 배포
git push origin develop  # → 1-2분 후 자동 배포

# 프로덕션 배포
git checkout main && git merge develop && git push origin main
```

---

## 2. 필수 작업 절차

### 2.1 브라우저 테스트 우선
- 모든 프론트엔드 변경은 **Claude가 먼저 브라우저 테스트 수행**
- 사용자에게 테스트 요청 금지

### 2.2 배포 규칙
- `apps/main-site/**` 또는 `apps/admin-dashboard/**` 변경 시 **수동 배포 필수**
- 스크립트: `./scripts/deploy-admin-manual.sh`, `./scripts/deploy-main-site-manual.sh`

### 2.3 API 호출 규칙
- **authClient 사용 필수**: `authClient.api.get()`, `authClient.api.post()`
- 환경변수 직접 사용 금지 (`VITE_API_URL` 등)
- 하드코딩된 URL 금지

### 2.4 새 패키지 생성 시
```bash
pnpm install                    # 패키지 생성 후 필수
git add pnpm-lock.yaml          # lockfile 커밋 포함 필수
```

---

## 3. App 개발 규칙 (AppStore 기반)

### 3.1 앱 계층 구조

```
Core App        → 플랫폼 기반 (forum-core, organization-core)
    ↑
Extension App   → Core 확장 (forum-yaksa, membership-yaksa)
    ↑
Service App     → 사용자-facing (cosmetics-store, yaksa-intranet)
```

### 3.2 의존성 규칙 (절대 준수)

| 허용 | 금지 |
|------|------|
| Core → Core | Core → Extension |
| Extension → Core | Core → Service |
| Service → Core | Extension → Service |
| Service → Extension | Service → Service |

**api-server 직접 import 절대 금지**

### 3.3 핵심 가이드라인 문서

| 앱 유형 | 필수 문서 |
|---------|-----------|
| Core App | `docs/app-guidelines/core-app-development.md` |
| Extension App | `docs/app-guidelines/extension-app-guideline.md` |
| Service App | `docs/app-guidelines/service-app-guideline.md` |
| 모든 앱 | `docs/app-guidelines/manifest-specification.md` |
| 리팩토링 | `docs/app-guidelines/refactoring-audit-guideline.md` |

### 3.4 Schema 규칙 (DB 변경 시)
- **Migration-First**: Entity 변경 전 migration 먼저 생성
- **Core Entity 수정 금지**: Extension/Service에서 Core entity 변경 불가
- 상세: `docs/app-guidelines/schema-drift-prevention.md`

---

## 4. 인프라

### 서버 정보

| 서버 | IP | SSH | 역할 |
|------|-----|-----|------|
| 웹서버 | 13.125.144.8 | `ssh o4o-web` | Nginx 프록시 |
| API 서버 | 43.202.242.215 | `ssh o4o-api` | Node.js (PM2) |

### 배포 경로

| 앱 | 경로 | 서버 |
|----|------|------|
| API | `/home/ubuntu/o4o-platform` | o4o-api |
| Admin (개발) | `/var/www/dev-admin.neture.co.kr` | o4o-web |
| Admin (프로덕션) | `/var/www/admin.neture.co.kr` | o4o-web |
| Main Site | `/var/www/neture.co.kr` | o4o-web |

### 배포 확인
```bash
curl -s https://dev-admin.neture.co.kr/version.json   # Admin 개발
curl -s https://admin.neture.co.kr/version.json       # Admin 프로덕션
curl -s https://neture.co.kr/version.json             # Main Site
```

---

## 5. 문서 구조

```
docs/
├── _standards/      # 문서 정리 기준
├── app-guidelines/  # 앱 개발 가이드라인 ⭐
├── specs/           # 앱별 스펙 (dropshipping, forum, cosmetics...)
├── design/          # 아키텍처/설계
├── plan/active/     # 진행 중인 작업
├── ops/             # 운영/배포
├── guides/          # 사용자 매뉴얼
├── reference/       # 기술 참고
├── reports/         # 완료 보고서
└── archive/         # 구버전
```

### 문서 작업 규칙
- 새 문서 생성 전: `docs/_standards/DOCUMENT_ORGANIZATION_STANDARD_v1.0.md` 확인
- App 스펙: `docs/specs/{app-id}/`
- 작업 계획: `docs/plan/active/`
- 완료 보고: `docs/reports/`

---

## 6. 주요 참조 문서

| 문서 | 용도 |
|------|------|
| `docs/app-guidelines/core-app-development.md` | Core App 개발 |
| `docs/app-guidelines/extension-app-guideline.md` | Extension App 개발 |
| `docs/app-guidelines/service-app-guideline.md` | Service App 개발 |
| `docs/app-guidelines/manifest-specification.md` | Manifest 규격 |
| `docs/app-guidelines/refactoring-audit-guideline.md` | 리팩토링 점검 |
| `docs/app-guidelines/schema-drift-prevention.md` | Schema 드리프트 방지 |
| `docs/ops/deployment-plan.md` | 배포 가이드 |
| `BLOCKS_DEVELOPMENT.md` | 블록 개발 |

---

*최종 업데이트: 2025-12-09*
