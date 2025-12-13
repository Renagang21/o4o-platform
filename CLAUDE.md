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

## 7. App Development Minimal Standards (for Claude)

앱 개발 시 Claude Code가 반드시 따라야 하는 최소 규칙:

### 7.1 TODO 기반 개발

- 앱 개발은 항상 `/packages/<app>/TODO.md`를 최우선 기준으로 진행
- TODO 템플릿: `docs/templates/APP_TODO_TEMPLATE.md`
- 완료된 항목은 문서에 반영 후 TODO에서 제거

### 7.2 Manifest 필수 구조

`manifest.ts`는 앱 개발의 출발점이며, 다음을 선언해야 한다:

| 항목 | 설명 |
|------|------|
| meta | appId, name, version, type, description |
| dependencies | core[], extension[] |
| cms | cpt[], acf[], viewTemplates[] |
| backend | entities[], services[], routes[] |
| navigation | menus[], adminRoutes[] |

### 7.3 Backend 필수 Export

`backend/index.ts`는 다음을 반드시 export:

```typescript
export { createRoutes } from './routes';
export * from './entities';
export * from './services';
```

### 7.4 View 구조 규칙

- Next.js page 기반 금지
- View Component 기반으로만 구성 (ListView, DetailView, FormView)
- manifest.viewTemplates에 등록

### 7.5 아키텍처 준수

모든 구조 변경은 다음 기준 준수:
- **CMS 2.0**: CPT/ACF 기반 데이터 구조
- **AppStore**: manifest 기반 앱 등록
- **ModuleLoader**: 자동 백엔드 로딩
- **ViewSystem**: 컴포넌트 기반 렌더링

### 7.6 문서 참조 순서

앱 개발 시 참조 순서:

1. `docs/specs/{app-id}/` - 앱 스펙
2. `docs/app-guidelines/` - 개발 가이드라인
3. `docs/design/architecture/` - 아키텍처 문서
4. `docs/reference/glossary.md` - 용어집

---

## 8. Work Order 공통 규칙 (All App Development Must Comply)

본 규칙은 모든 App(Core / Extension / Service)의 Work Order에 자동 적용되며,
Work Order에서 별도 명시하지 않아도 반드시 준수해야 한다.

---

### 8-1. 브랜치 규칙 (필수)

* 모든 기능 개발은 반드시 `feature/*` 브랜치에서 수행
* `develop` 브랜치에서는 기능 개발 금지
* 브랜치명 규칙:
  * `feature/<app-id>-phase<n>`
  * 예: `feature/sellerops-phase2`, `feature/pharmacy-core-v1`

#### 브랜치 전환 전

```bash
git add .
git commit -m "save state"
```

#### 브랜치 전환 후

```bash
git pull --rebase
```

---

### 8-2. 개발 규칙 (CLAUDE.md 전체 프로세스 준수)

* 새 패키지 생성 시 `pnpm install` 필수
* `pnpm-lock.yaml` 항상 커밋
* API 호출 시 `authClient` 사용, URL 하드코딩 금지
* `api-server` 모듈 직접 import 금지 (AppStore Loader 사용)
* Entity 변경 시 migration-first 원칙
* Claude Code는 UI 변경 시 항상 브라우저 테스트 먼저 수행

---

### 8-3. AppStore 규칙

모든 앱은 다음 필수 파일을 가져야 한다:

```
manifest.ts
lifecycle/install.ts
lifecycle/activate.ts
lifecycle/deactivate.ts
lifecycle/uninstall.ts
```

그리고 다음 조건 필요:

* manifestRegistry에 등록되어야 서버가 로딩
* appsCatalog.ts에 등록되어야 AppStore UI에 표시
* AppStore 설치/활성화/비활성/삭제가 정상 작동해야 함

---

### 8-4. 앱 폴더 구조 규칙

```
packages/<app>/
  src/
    backend/controllers/
    backend/services/
    backend/dto/
    frontend/pages/
    frontend/components/
    lifecycle/
    manifest.ts
    index.ts
```

---

### 8-5. API / Entity / DTO 규칙

* Controller → Service → Entity 3계층 구조 유지
* Service는 `list/detail/create/update/delete` CRUD 메서드를 포함
* 모든 Entity는 `index.ts`에서 export
* 모든 DTO는 필드명·타입 정합성 유지
* Core Hook(e.g., validateOffer, validateListing 등) 반드시 연결

---

### 8-6. 품질 기준 (Definition of Done)

* `pnpm -F <app> build` 성공
* AppStore 설치 & 활성화 성공
* UI 화면 정상 렌더링 / 콘솔 에러 없음
* develop 브랜치에 대한 PR 테스트 통과
* 필요한 경우 Antigravity UI 테스트 수행
* docs/plan/active 또는 docs/reports에 결과 업데이트

---

## 9. E-commerce Core 운영 규칙 (주문/결제 개발 필수)

> **이 규칙은 "권장"이 아닌 "기본 전제"입니다.**
> 주문/결제 기능이 있는 모든 서비스는 예외 없이 준수해야 합니다.

### 9.1 핵심 원칙 (절대 준수)

| 원칙 | 설명 |
|------|------|
| **주문 생성 = E-commerce Core** | 모든 주문은 `EcommerceOrderService.create()` 호출 필수 |
| **OrderType 불변성** | OrderType은 생성 시 결정, 이후 변경 금지 |
| **ecommerceOrderId 필수 연결** | 서비스 Entity는 반드시 ecommerceOrderId 저장 |

### 9.2 주문/결제 개발 체크리스트

신규 서비스에서 주문/결제 기능 개발 시:

```
☐ EcommerceOrderService.create() 호출 코드 있음
☐ OrderType 명시적 지정 (retail, dropshipping, b2b, subscription)
☐ ecommerceOrderId를 서비스 Entity에 저장
☐ findByEcommerceOrderId() 조회 메서드 구현
☐ 통계 조회 시 EcommerceOrderQueryService 사용
```

### 9.3 금지 사항

| 금지 | 사유 |
|------|------|
| E-commerce Core 우회 주문 생성 | 판매 원장 무결성 훼손 |
| OrderType 생성 후 변경 | 통계/분기 로직 파괴 |
| ecommerceOrderId 없이 서비스 주문만 생성 | 통합 조회 불가 |
| dropshipping 외 OrderType에서 Relay 사용 | 구조 오용 |

### 9.4 미적용 예외

E-commerce Core를 적용하지 않아도 되는 경우:
- 주문/결제 개념이 없는 순수 컨텐츠/커뮤니티 서비스
- 인프라/UI 전용 패키지

**단, 미적용 시 반드시 문서화 필수** (`docs/guides/ecommerce-core/exemption-policy.md` 참조)

### 9.5 관련 문서

| 문서 | 용도 |
|------|------|
| `docs/guides/ecommerce-core/agent-guidelines.md` | 개발 에이전트 가이드라인 |
| `docs/guides/ecommerce-core/new-service-order-checklist.md` | 신규 서비스 체크리스트 |
| `docs/guides/ecommerce-core/exemption-policy.md` | 미적용 예외 규칙 |
| `docs/specs/ecommerce-core/application-status.md` | 적용 현황 |

---

*최종 업데이트: 2025-12-13*
