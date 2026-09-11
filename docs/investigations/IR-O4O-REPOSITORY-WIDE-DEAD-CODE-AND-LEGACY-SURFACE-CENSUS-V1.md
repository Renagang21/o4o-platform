# IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1

> **상태**: COMPLETE_WITH_UNKNOWNS · **조사일**: 2026-09-11 · **성격**: 조사 전용 (코드·패키지·DB·GCP 무변경)
> **선행**: `WO-O4O-ARCHIVE-RETENTION-AND-TRACKED-BACKUP-FINAL-DISPOSITION-V1` (CLOSED `19bcde423`) ·
> `WO-O4O-UNPROVISIONED-FORM-AND-LEGACY-APP-AXIS-FINAL-DISPOSITION-V1` · `WO-O4O-WORDPRESS-COMPAT-FIELD-AND-THEME-CONTRACT-FINAL-DISPOSITION-V1`
> **원칙**: 이름만으로 dead 판정하지 않는다 · 의존자 0 만으로 삭제하지 않는다 · 운영 미확인 = UNKNOWN (코드 추정으로 ZERO 선언 금지)

---

## 1. 기준선 (§2)

| 항목 | 값 |
|---|---|
| 조사 worktree | `C:/tmp/o4o-legacy-census` · branch `work/o4o-legacy-census-v1` |
| 조사 base HEAD | `e19aeb2aa` (조사 시작 시점 `origin/main`) |
| 조사 종료 시점 `origin/main` | `09e0ad9c7` (조사 중 다른 세션 5 commit 진행 — 본 IR 은 `e19aeb2aa` 트리 기준 실측, 문서만 최신 main 위에 rebase 후 commit) |
| `git status` | clean (조사 문서 1건 외 변경 0) |
| worktree 수 | 27 (`git worktree list`) |
| tracked 파일 수 | 27,983 (`git ls-files`) |
| workspace 패키지 | apps 6 · services 8 (`services/mobile-app` 는 `pnpm-workspace.yaml` 제외) · packages 57 |
| tracked `tmp/**` | 169 files · 43,601,889 B (`.gitignore` 미등재) |
| 운영 DB 실측 | Cloud SQL Auth Proxy 경유 read-only (`o4o_platform`, 2026-09-11) · 자격정보는 Secret Manager 경로만 사용, 본 문서·터미널·커밋에 미기록 |

**조사 도구 (scratchpad, 저장소 미추적)**: `api.mjs` (backend mount 확장 → route 3,047 / unique 2,422 · frontend API literal 대조), `graph.mjs` (패키지 의존 그래프 · route/controller 고아), `reach.mjs` / `reach2.mjs` (앱·패키지 import 도달성), `links.mjs` + `verify-links.mjs` (내부 링크 ↔ route 선언), `scripts.mjs` (scripts/** 참조 분류), `quality.mjs` (품질 지표 · 미사용 의존성), `axisE*.sql` (DB read-only).

---

## 2. 축 A — 앱·서비스 (apps/**, services/**)

| 대상 | Cloud Run (asia-northeast3) | deploy workflow | Dockerfile | 분류 |
|---|:---:|:---:|:---:|---|
| `apps/api-server` (`o4o-core-api`) | ✅ | `deploy-api.yml` | ✅ | ACTIVE_CANONICAL |
| `apps/admin-dashboard` (`o4o-admin-dashboard`) | ✅ | `deploy-admin.yml` | ✅ | ACTIVE_CANONICAL |
| `services/web-neture` (`neture-web`) | ✅ | `deploy-web-services.yml` | ✅ | ACTIVE_CANONICAL |
| `services/web-k-cosmetics` (`k-cosmetics-web`) | ✅ | 〃 | ✅ | ACTIVE_CANONICAL |
| `services/web-kpa-society` (`kpa-society-web`) | ✅ | 〃 | ✅ | ACTIVE_CANONICAL |
| `services/web-kpa-branch` (`kpa-branch-web`) | ✅ | 〃 | ✅ | ACTIVE_CANONICAL |
| `services/web-pharmacy-hub` (`pharmacy-hub-web`) | ✅ | 〃 | ✅ | ACTIVE_CANONICAL |
| `services/signage-player-web` (`signage-player-web`) | ✅ | 〃 | ✅ | ACTIVE_SERVICE_SPECIFIC |
| `services/web-account` (19 files) | ❌ | 없음 | ✅ | **UNKNOWN_REQUIRES_RUNTIME_CHECK** — `docs/baseline/O4O-MYPAGE-CANONICAL-V1.md` 가 최소 계정센터로 정의하나 배포 경로 없음 (정의됨·미배포) |
| `apps/forum-api` (14 files, 마지막 commit `6a8cc13f0` 2025-12-25) | ❌ | 없음 | ✅ | DEAD_RUNTIME 후보 (UNKNOWN — 사업 결정 필요) |
| `apps/forum-web` (23 files) | ❌ | 없음 | ❌ | DEAD_RUNTIME 후보 (UNKNOWN) |
| `apps/page-generator` (44 files) | ❌ | 없음 | ❌ | DEAD_RUNTIME 후보 (UNKNOWN) |
| `services/mobile-app` | ❌ (workspace 제외) | 없음 | ❌ | DEAD_RUNTIME 후보 (UNKNOWN) |
| Cloud Run `glucoseview-web` | ✅ (잔존) | 없음 (소스 `4274982e5` 에서 제거) | — | **잔존 인프라** — GCP write 금지 범위이므로 삭제는 별도 WO (UNKNOWN) |

앱별 import 도달성 (`reach.mjs`, entry = main/index/App/scripts/migrations/tests): 미도달 non-test src — `api-server` 23 (예: `main-minimal.ts`, `migrate.ts`, store-ai 계열 service, `operator-dashboard-queries` / `operator-alert` utils) · `admin-dashboard` 15 · `web-neture` 1 · 나머지 0. 전부 DEAD_RUNTIME 후보 (raw-source spec 소비 여부는 정비 WO 에서 `check-literal-consumers.mjs` 로 재확인).

---

## 3. 축 B — 패키지 (packages/** 57)

**외부 import 0 (`graph.mjs`, apps/services/packages/scripts 전역 검색)** — 7건. 의존자 0 만으로 삭제하지 않으며 사업 결정 대상:

| 패키지 | 비고 | 처분안 |
|---|---|---|
| `@o4o/auth-core` | Core 동결 대상(CLAUDE.md §3) — 문서상 동결이나 import 0 | UNKNOWN (동결 정책과 함께 판단) |
| `@o4o/financial-core` | 소비자 0 | DELETE 후보 |
| `@o4o/forum-cosmetics` | 소비자 0 · 미도달 src 2 | DELETE 후보 |
| `@o4o/operator-core` | 소비자 0 (`OPERATOR-CORE-DESIGN-V1` 설계 문서 존재) | UNKNOWN |
| `@o4o/organization-forum` | 소비자 0 · 미도달 src 7 | DELETE 후보 |
| `@o4o/organization-lms` | 소비자 0 · 미도달 src 6 · 미사용 dep 2 | DELETE 후보 |
| `@o4o/partner-core` | 소비자 0 | DELETE 후보 |

**패키지 내부 미도달 src (`reach2.mjs`, entry = package.json main/module/exports/bin + tests)**: `forum-core` 34 (= 추적 생성 산출물, §7) · `lms-core` 9 · `cms-core` 8 · `ui` 8 · `organization-forum` 7 · `auth-client` 6 · `organization-lms` 6 · `platform-core` 2 · `pharmacy-ai-insight` 2 · `forum-cosmetics` 2 · `ai-core` / `auth-core` / `cpt-registry` / `organization-core` / `types` / `utils` 각 1. `forum-core` 의 `admin-ui/ForumReports` · `ForumPostDetail` 은 어느 앱도 mount 하지 않음 → DEAD_UI.

KEEP/MERGE/SPLIT 판정: 위 7건 외 50 패키지는 KEEP (소비자 ≥1). MERGE/SPLIT 후보 없음 (본 조사 범위에서 구조 재편 근거 미발견).

---

## 4. 축 C·D — Menu → Route → Page → API client → Backend route → Authorization → DB

### 4-1. admin-dashboard 구조 사실
- backend `navigation/admin` · `routes/admin` 는 STUB (빈 응답) → `useAdminMenu` 는 항상 `adminMenuStatic` (정적 22 경로) 로 fallback. `DynamicRouteLoader` 는 어디에도 mount 되지 않음 → `ViewComponentRegistry` 등록 전체 DEAD_RUNTIME / PLACEHOLDER.
- 대시보드 3중 존재 (DUPLICATED_ACTIVE): `/admin` `AdminDashboard` (정적 메뉴 랜딩) · `/home` `AdminHome` · `/dashboard` `UnifiedDashboard`.
- `UnifiedDashboard` 카드 6종 (`pages/dashboard/unified/cards/*`) + `useUserContext.ts`: API 호출이 주석 처리되고 0 고정값 반환 (`WO-O4O-FINAL-MOCK-REMOVAL-DB-CONNECTION-V1` 주석) → PLACEHOLDER_OR_MOCK.
- API client 3계열 공존 (DUPLICATED_ACTIVE): `api/unified-client.ts` (baseURL `.../api`) · `lib/api-client.ts` (root) · `@o4o/auth-client` `authClient.api` (`/api/v1`). prefix 차이가 아래 BROKEN 의 주요 원인.
- `/__debug__/**` 백엔드는 `NODE_ENV !== 'production'` 게이트 (`register-routes.ts:1080-1103`, 잔존 `/__debug__/user` 1건) · `node scripts/check-unsafe-routes.mjs` → 검사 1,137 파일 · 위반 0.
- `test.routes` (`AuthDebug` `/auth/check`, `AIPageGeneratorTest`, `AIBlockDebug`) = PROD 게이트 → TEST_GUARD_ONLY.

### 4-2. BROKEN_UI_API — 도달 가능한 화면 + 존재하지 않는 backend route (admin 17)

| # | 화면 (route) | 호출 | backend 실측 |
|---|---|---|---|
| 1 | `OrderDetailPage` `/admin/orders/:id` | `/api/v1/admin/orders/*` | `/api/admin/orders` (non-v1) 만 존재 — prefix 불일치 |
| 2 | phase2.4 `/admin/dashboard/operations` | `/admin/dashboard/operations*` · `/admin/dashboard/partners/:id` · `/admin/dashboard/system` · `/partners/stats` | 없음 |
| 3 | `pages/menus/*` `/appearance/menus/*` | `/api/menus/*` | 없음 |
| 4 | presets `/cpt-engine/presets/{forms,views,templates}` | `/presets/*` | 없음 |
| 5 | cpt-acf `acf.api.ts` | `/cpt/custom-post-types` · `/posts/categories` · `/roles` · `/taxonomies*` · `/templates/page|post` | 없음 (backend 는 `/api/v1/cpt/*` 23 route 다른 형태) |
| 6 | `RoleApplicationsAdminPage` `/admin/role-applications` | `/admin/roles/applications*` | 없음 (`/api/v2/roles/applications/my` 만) |
| 7 | `TemplateParts` `/appearance/template-parts` | `/template-parts/*` | 없음 |
| 8 | `MediaFileReplace` `/tools/media-replace` | `/media` · `/media/:id/replace` | 없음 |
| 9 | Media 화면 `/media/*` · `/content-resource/media-assets` | `/content/media/*` | 없음 (canonical = `/api/v1/platform/media-library/*`) |
| 10 | `EnrollmentManagement` `/enrollments` · `/admin/enrollments` | `/admin/enrollments*` | 없음 |
| 11 | `registerWidgets` | `/admin/enrollments/stats` · `/orders*` · `/products/low-stock` | 없음 |
| 12 | `userApi` | `/admin/users/:id/approve|reject` · `/users/:id/suspend|reactivate` | 없음 (canonical `/api/v1/users/:id/approve` · `/api/v1/admin/users/:id/status`) |
| 13 | settings | `/settings/cache/clear` · `/settings/oauth/test` | 없음 |
| 14 | `store-content.api` | `/lms/content-analytics/track` | 없음 |
| 15 | `BusinessInfoSection` | `/users/:id/business-info` | 없음 |
| 16 | AI (`/ai/generate` `save-block` `saved-blocks` `policy`) | `/api/v1/ai/*` 로 호출 | backend 는 `/api/ai/*` (38 route, non-v1) — prefix 불일치 |
| 17 | `PartnerListPage` (NetureRouter `partners`) | `PATCH /neture/admin/partners/:id/status` | GET list/:id 만 존재 |

`contentApi` (admin/categories/reorder · custom-fields · menus · stats · templates · utils/generate-slug · content/media) 와 `postApi` (`/posts*` `/tags` `/categories` `/media`) 는 editor block · `useImageUpload` · `ContentFormModal` 이 소비 → 동일 BROKEN 계열 (위 3·9 와 묶음). 오탐 확인: `/api/v1/users` · `/users/:id` · `/users/:id/approval-history` · `/userRole/:userId/permissions` 는 존재.

### 4-3. 다른 서비스 BROKEN_UI_API (3) · DEAD_API (2)
- **k-cosmetics** `SupplyPage` (`b2b/supply`): `/cosmetics/suppliers` · `/cosmetics/supply/products` 없음 → BROKEN.
- **k-cosmetics** `TouristHubPage` (`services/tourists`): `/cosmetics/tourist-hub/stores` 없음 (`/stats` 만) → 부분 BROKEN.
- **k-cosmetics** `api/channelProducts.ts` (`StoreChannelsPage`, `App.tsx:839` `channels`): `/api/v1/store-hub/channel-products/*` 없음 (실재: `/api/v1/{cosmetics,kpa,join}/store-hub/channel-products/*` · `/api/v1/store/channel-products/*`) → BROKEN.
- **DEAD_API** `/api/v1/accounts/sso/check` (`auth-client` `checkSession`; 소비자 `forum-web AuthContext` · `auth-context AuthProvider`) — backend 부재.
- **DEAD_API** `auth-client/cookie-client.ts` `/auth/cookie/*` · `/enrollments*` — 소비자 `CookieAuthProvider` / `SSOAuthProvider` 자체가 미소비.
- kpa-society / neture / kpa-branch / pharmacy-hub / store-ui-core 의 API literal 은 backend 와 정합 (미매칭 141 중 admin 105, 나머지 오탐 또는 위 항목).
- "unmount 된 route 파일" 2건은 오탐: `modules/neture/drug-import/drug-otc-route.ts` (helper, `drug-otc-translation-input.ts:14` 가 import), `services/ai-tools/ai-tool-router.ts` (express 아님).

### 4-4. 내부 dead link (route 선언 없는 `to`/`href`) — 확정 41

| 앱 | 확정 target | 출처 |
|---|---|---|
| admin (33) | `/activity-log` `/analytics` `/calendar` `/comments` `/content/pages` `/content/posts` `/content/posts/new` `/content/posts/123` `/ecommerce/orders` `/ecommerce/products/new` `/orders` `/posts/1` `/posts/2` `/posts/new` `/products` `/products/456` `/products/new` `/reports` `/reports/sales` `/reviews` `/system/monitoring` `/vendors` `/vendors/new` | `AdminHome.tsx` · `AdminDashboard.tsx` |
| | `/admin/membership/dashboard` `/inventory` `/partner/clients` `/partner/reports` `/profile` `/supplier/orders` | `dashboard/unified/cards/*` |
| | `/admin/appstore` (`AppGuard`) · `/admin/products` (`useKeyboardShortcuts`) · `/admin/settings/app-services` (`SimpleAIModal`) · `/apply` (`GlucosecareParticipationNotice`) | 각 파일 |
| neture (6) | `/account/partner/contents/new` `/operator/ai-admin/context-assets` `/operator/partner-settlements` `/operator/partners` `/operator/settings` `/partner/collaboration` | (raw 11 중 `/admin/platform/*` 5건은 nested 선언 오탐) |
| kpa-society (1) | `/info/glucose-program` | `PharmacyJoinPage.tsx:65` · `PharmacyServicePage.tsx` |
| k-cosmetics (1) | `/platform/stores/products/new` | `pages/platform/ProductsPage.tsx:133,191` (`products/new` route 0) |
| pharmacy-hub (0) | — | `blog/new` · `foreign-visitor/partners` 는 nested 선언 확인 |

UNKNOWN (판정 보류): admin `/admin/o4o-product-db/masters/new` (nested `masters/new` 선언 존재 → 오탐 가능성 높음) · kpa `/tablet` (`App.tsx:1108` `KpaRedirect to="/tablet"`; 선언은 `/tablet/:slug` 뿐 — redirect 가 slug 를 붙이는지 런타임 확인 필요).

---

## 5. 축 E — Entity·DB (운영 read-only 실측 2026-09-11)

| 축 | 코드 | 운영 DB | 분류 |
|---|---|---|---|
| `apps` | `App` entity retired (`database/entities.ts:63-67`, `WO-O4O-UNPROVISIONED-FORM-AND-LEGACY-APP-AXIS-FINAL-DISPOSITION-V1`) · 읽기 소비자 0 | 테이블 존재 · 1 row (`google-gemini-text` · active · isSystem=true · 최종 updatedAt 2025-12-29) · FK 참조 0 | ORPHAN_DATABASE_AXIS |
| `app_usage_logs` | `AppUsageLog` retired | 테이블 존재 · 0 row | ORPHAN_DATABASE_AXIS |
| `app_instances` | `AppInstance` retired (`WO-O4O-APP-INSTANCES-LIFECYCLE-CENSUS`) | 테이블 존재 · 0 row | ORPHAN_DATABASE_AXIS |
| `app_registry` | 정본 (`AppRegistry`) | 2 row (`digital-signage-core`, `partnerops`) | ACTIVE_CANONICAL |
| `themes` (`Theme`, `ThemeInstallation`) | `entities/Theme.ts` 등록 (`entities.ts:36,605-606`) · service/controller 소비자 0 · migration 0 | 테이블 **없음** (`themes`/`theme` 부재) | DEAD_ENTITY — `WO-O4O-WORDPRESS-COMPAT-…-CHECK.md:120,165,285` 가 "별도 DB 축 · §11 후속" 으로 유보한 항목 |
| `typeorm_migrations` | — | 670 row · 최신 `AddAnnualReportTemplateReferenceYears20270406000000` · public base table 274 | 참고 |

`synchronize: false` 이므로 `Theme` entity 등록은 부팅에 무해하나 스키마 없는 entity 가 metadata 에 남아 있다. 3개 orphan 테이블 DROP 은 migration 생성이 필요하므로 본 IR 범위 밖 (묶음 D).

---

## 6. 축 F — Script · CI · 설정

### 6-1. `scripts/**` 54 파일 참조 분류 (`scripts.mjs`)
- **CI 7** (ACTIVE_SHARED_INFRASTRUCTURE): `README.md` · `appstore-guard.ts` · `audit/README.md` · `check-typeorm-entities.mjs` · `check-unsafe-routes.mjs` · `ci-build-app.sh` · `lint-ratchet.mjs`
- **PKG 10** (package.json 참조 · ACTIVE): `dev-start.sh` · `dev.mjs` · `development/dev.sh` · `generators/openapi-types-generator.ts` · `git/check-staged-scope.mjs` · `install.sh` · `quality/check-literal-consumers.mjs` · `setup-local-db.sh` · `verify-blocks.ts` · `verify-cpts.ts`
- **SCRIPT_ONLY 13** (다른 script 만 참조 · DEAD_SCRIPT 후보): `audit/REGISTRY_AUDIT_REPORT.md` · `audit/check-block-registry.ts` · `ci-complete-setup.sh` · `clean-before-build.sh` · `cleanup-backups.sh` · `generators/web-admin-generator.ts` · `generators/web-extension-generator.ts` · `monitoring-dashboard.cjs` · `notification-system.cjs` · `performance-monitor.cjs` · `setup-monitoring.sh` · `start-monitoring.sh` · `update-package-versions.sh`
- **DOC_ONLY 9** (문서 참조만 · HISTORICAL_ONLY/KEEP): `.gitkeep` · `audits/*.sql` ×5 · `check-forbidden-tables.mjs` (`O4O-STORE-RULES.md:139` 참조) · `cms/normalize-blocknames.ts` · `reset/O4O-RESET-DRYRUN-V1.sql`
- **NO_REF 15** (참조 0 · DEAD_SCRIPT 확정 후보): `apiserver-validation.cjs` · `check-cpt-posts.cjs` · `ci-install-fixed.sh` · `cli/o4o.ts` · `ensure-ai-settings.sh` · `fix-e2e-test-view-text.ts` · `fix-view-text.sh` · `performance-benchmark.cjs` · `phase9-integration-test.sh` · `rollback-phase1.sh` · `rollback-phase2.sh` · `ssh-key-converter.py` · `sync-local.sh` · `verify/verify-ai-content-modal.mjs` · `verify/verify-o4o-apply-form.mjs`

### 6-2. 설정 · CI
- `apps/api-server/package.json` scripts: `deploy:production` / `deploy:staging` → `pm2:reload`, `pm2:*` 가 참조하는 `ecosystem.config.apiserver.cjs` **부재**, `monitor` → `scripts/pm2-monitor.sh` **부재**. CLAUDE.md §6 이 PM2 를 금지하므로 DEAD_CONFIG (package.json 변경 = §1 금지 → 묶음 F).
- `packages/appearance-system/package.json` `test` / `test:watch` / `test:coverage` = `NODE_OPTIONS=--experimental-vm-modules jest` (cross-env 없음) → Windows 에서 실패하는 POSIX inline env script **확정** (§6 항목 12). 그 외 모든 package 는 cross-env 사용.
- `.github/workflows/` 14개 전부 참조 정상. 경로 미존재 참조는 `ci-pipeline.yml → packages/types/dist{,/forum.d.ts,/index.d.ts}` (build 산출물, 정상) 뿐. `deploy-api.yml` 의 `apps/cms-core` · `apps/digital-signage-core` 는 패키지명 문자열 (`@o4o-apps/*`) 로 오탐.
- `apps/api-server/scripts/` (cleanup-*.ts · delete-seed-data.sql · reset-product-test-data.sql · run-migration*.js 등) 는 참조 미검증 → UNKNOWN (묶음 F 에서 개별 확인).

---

## 7. 축 G — 추적 생성 산출물 (TRACKED_GENERATED_ARTIFACT)

| 위치 | 파일 수 | 내용 |
|---|:---:|---|
| `packages/auth-client/src/**` | 28 | `*.d.ts` · `*.d.ts.map` · `*.js.map` (예: `axios.d.ts`, `client.d.ts`, `client.js.map`) |
| `packages/forum-core/src/**` | 34 | `backend/entities/*.js` · `*.d.ts.map` · `*.js.map` (예: `ForumComment.js`) |

합계 62. 둘 다 tsc 출력이 `src/` 에 섞여 추적된 형태로, `.gitignore` 패턴 추가와 함께 제거 대상 (묶음 B).

---

## 8. 축 H — `tmp/**` 169 files · 43,601,889 B (묶음별)

| 묶음 (`tmp/<dir>`) | files | bytes | 마지막 갱신 | docs 참조 | 처분안 |
|---|:---:|:---:|---|:---:|---|
| `cosmetics-retail-census` | 12 | 12.7 MB | 2026-08-07 | 10 | 산출물 → 문서 archive 이관 후 tmp 제거 |
| `cosmetics-store-to-b2b-copy` | 14 | 7.5 MB | 08-12 | 1 | 〃 |
| `cosmetics-guide-production` | 20 | 7.1 MB | 08-11 | 3 | 〃 |
| `cosmetics-guide-gap-enrichment` | 39 | 5.3 MB | 08-11 | 3 | 〃 |
| `cosmetics-name-cleanup` | 7 | 4.3 MB | 08-11 | 3 | 〃 |
| `cosmetics-pilot` | 7 | 3.8 MB | 08-07 | 7 | 〃 |
| `cosmetics-productmaster-apply-pilot` | 13 | 1.6 MB | 08-11 | 2 | 〃 |
| `cosmetics-mfds-usage-caution` | 21 | 1.06 MB | 08-11~12 | 1 | 〃 |
| `product-db-write-authority` | 7 | 60 KB | 08-11 | 2 | 〃 |
| (root) `delete_list_*.json` ×4 · `*_install.sql` ×4 | 8 | 31 KB | 2025-12-10 | 0 | HISTORICAL_ONLY — 제거 후보 |
| `admin-product-description-auth-boundary` | 3 | 20 KB | 08-11 | 2 | 이관 후 제거 |
| `product-landing-coverage-closure` | 10 | 19.6 KB | 2026-09-04 | 1 | 최신 — 소유 WO 확인 후 |
| `product-ai-tags-ownership` | 6 | 7 KB | 08-11 | 1 | 이관 후 제거 |
| `supplier-productmaster-nondestructive-link` | 2 | 4.4 KB | 08-11 | 1 | 이관 후 제거 |

자격정보 패턴(password/token/secret/BEGIN … KEY/DB URL) 검색 결과 0. 일괄 삭제 금지 — 묶음별로 참조 문서 링크를 archive 로 옮긴 뒤 제거 (묶음 A).

---

## 9. 축 I — 의존성 · 품질 지표

| 지표 | 값 |
|---|---|
| `@ts-ignore` / `@ts-expect-error` | 1 / 1 |
| `eslint-disable` | 141 |
| TODO/FIXME/HACK/XXX | 80 |
| `console.log` (test·script 제외) | 4,189 |
| 빈 `catch {}` | 14 (FAILURE_HIDING_FALLBACK 후보) |
| `as any` | 2,436 |

**미사용 의존성 후보 50** (`package.json` 변경은 §1 금지 → 묶음 G): `admin-dashboard` 28 (`@emotion/react` `@emotion/styled` `@heroicons/react` `@mui/icons-material` `@mui/material` `@radix-ui/*` ×13 `@remix-run/router` `@tanstack/react-query-devtools` `ajv` `js-cookie` `papaparse` `react-dnd` `react-dnd-html5-backend` `react-helmet-async` `socket.io-client` · dev `terser`) · `api-server` 5 (`@o4o/pharmacy-ai-insight` `eventemitter2` `path-to-regexp` `pino-http` · dev `pino-pretty`) · `auth-client` `js-cookie` · `auth-utils` `@o4o/types` · `block-renderer` `@o4o-apps/content-core` `@o4o/types` · `cms-core` `@o4o-apps/content-core` · `content-editor` `@tiptap/pm` (peer — 필요 가능성 높음) · `organization-lms` `@o4o/organization-core` `@o4o/lms-core` · `signage-player-web` `@o4o/content-editor` · dev `globals` · `web-k-cosmetics` `@o4o/forum-core` · `web-kpa-branch` `@o4o/types` `lucide-react` · `web-kpa-society` `@o4o/ai-components` `@o4o/screen-content-core` · `web-neture` `@o4o/screen-content-core` `@o4o/tablet-kiosk-core`. 주의: `@o4o/screen-content-core` 는 web Dockerfile 선별 COPY 에 필요할 수 있어 import 0 만으로 제거 금지.

---

## 10. §6 알려진 인계 13항목 재검증

| # | 항목 | 현재 상태 | 근거 |
|---|---|---|---|
| 1 | tmp/** 169 | **잔존** | §8 |
| 2 | `auth-client/src` 생성 산출물 28 | **잔존** | §7 |
| 3 | `forum-core/src` 생성 산출물 34 | **잔존** | §7 |
| 4 | 운영 `apps` 테이블 | **잔존** (1 row · entity retired) | §5 |
| 5 | `app_usage_logs` | **잔존** (0 row · entity retired) | §5 |
| 6 | admin Overview 하드코딩 통계 | **잔존** — `AdminHome.tsx` `'₩12,345,000' '24' '1,234' '456'` · quick link 수치 `15/5/2/125` · `UnifiedDashboard` 카드 0 고정 | §4-1 |
| 7 | admin `/comments` dead link | **잔존** — `AdminDashboard.tsx:120` · `AdminHome.tsx` | §4-4 |
| 8 | admin 가짜 뉴스 피드 | **잔존** — `AdminDashboard.tsx:256-275` "WordPress 뉴스 피드 / O4O 플랫폼 뉴스" `href="#"` | §4-1 |
| 9 | Theme entity | **잔존** — DEAD_ENTITY (운영 테이블 없음) | §5 |
| 10 | `docs/README.md` archive 수치 drift | **잔존** — 문서 `:63-68` 289/153/29/20/10/4 vs 실측 investigations 292 · audits 154 · checks 56 · reports 21 · obsolete 11 · work-orders 6 (총 540) | `git ls-files docs/archive` |
| 11 | `docs/services/cosmetics/service-definition.md` 의 `ecommerce` 앱 | **잔존** — `:44` `ecommerce-core` · `:78` `ecommerce (소비자 프론트엔드)` — 해당 앱 부재 (`O4O-STORE-COMMERCE-BOUNDARY-V1` 과도 충돌) | 파일 확인 |
| 12 | Windows 실패 POSIX inline env script | **잔존** — `packages/appearance-system/package.json` `test*` 3건 | §6-2 |
| 13 | 로컬 agent port 충돌 테스트 격리 | **UNKNOWN** — `__tests__/local-agent-oneclick-pairing.spec.ts:318` `const PORT = 47821` 고정 port · child process spawn 유지. 격리 여부는 병렬 실행 실측 필요 | 파일 확인 |

해결된 항목: 0 / 13.

---

## 11. 보안 · 중지조건

- 자격정보 노출: tmp/** · scripts/** · 조사 산출물에서 패턴 검색 0.
- `/__debug__/**` 프로덕션 게이트 확인 · `check-unsafe-routes.mjs` 위반 0.
- 인증 없는 write route 신규 발견 0.
- **SECURITY_CRITICAL_FINDINGS = 0 · IMMEDIATE_STOP_CONDITIONS = 0** (§10 중지조건 10개 중 발동 0 — 코드·DB·GCP 변경 없음, 다른 세션 파일 접촉 없음).

---

## 12. 위험도 (R) · 영향도 (E) · 우선순위 (§8)

| 순위 | 대상 | R | E | 근거 |
|:---:|---|:---:|:---:|---|
| 1 | admin BROKEN_UI_API 17 + dead link 33 + 하드코딩 통계·가짜 피드·3중 대시보드 | R1 | E4 | 운영자가 매일 보는 화면에서 오류/허위 정보. 코드 삭제·화면 정리만으로 해결 (DB 무관) |
| 2 | k-cosmetics BROKEN 3 (`SupplyPage` · `TouristHub` · `channelProducts` prefix) | R2 | E3 | 매장 화면 오류. prefix 수정 vs 화면 제거 결정 필요 |
| 3 | 추적 생성 산출물 62 (`auth-client/src` · `forum-core/src`) | R0 | E2 | 빌드 불일치 위험 · 삭제 무해 |
| 4 | tmp/** 169 (43.6 MB) | R0 | E2 | 저장소 비대 · 묶음별 이관 |
| 5 | DEAD_SCRIPT 15 (NO_REF) + SCRIPT_ONLY 13 + PM2 DEAD_CONFIG + appearance-system POSIX script | R1 | E2 | package.json 변경 포함 → 단독 WO |
| 6 | 미도달 src (api-server 23 · admin 15 · packages ~90) + DEAD_API 2 + DEAD_UI (forum-core admin-ui) + `DynamicRouteLoader`/`ViewComponentRegistry` | R2 | E2 | raw-source spec 재확인 후 삭제 |
| 7 | orphan 패키지 7 + 미배포 앱 5 (`web-account` 별도 판단) + Cloud Run `glucoseview-web` 잔존 | R3 | E3 | 사업 결정 필요 (UNKNOWN) |
| 8 | ORPHAN_DB_AXES 3 (`apps` · `app_usage_logs` · `app_instances`) + DEAD_ENTITY `Theme` | R3 | E1 | migration 생성 + 사용자 승인 필요 · 기능 영향 0 |
| 9 | 미사용 의존성 50 · 품질 지표 | R2 | E1 | lockfile 변경 → 마지막 |
| 10 | 문서 drift 2 (`docs/README.md` 수치 · cosmetics `ecommerce`) | R0 | E1 | 문서 WO |

---

## 13. 후속 WO 묶음 (§9 A~G 매핑)

| 묶음 | 제안 WO | 범위 |
|---|---|---|
| **A** tmp 정리 | `WO-O4O-TRACKED-TMP-BUNDLE-ARCHIVE-AND-REMOVAL-V1` | §8 14 묶음 개별 처분 · `.gitignore` `tmp/` 추가 |
| **B** 생성 산출물 | `WO-O4O-TRACKED-GENERATED-ARTIFACT-REMOVAL-V1` | §7 62 파일 + `.gitignore` 패턴 |
| **C** admin 정비 | `WO-O4O-ADMIN-DASHBOARD-BROKEN-SURFACE-AND-DEAD-LINK-CLEANUP-V1` | §4-2 17 · §4-4 33 · 대시보드 3중 통합 · 하드코딩 통계/가짜 피드 · `DynamicRouteLoader` 계열 (우선순위 1) |
| **C'** 서비스 정비 | `WO-O4O-SERVICE-FRONTEND-BROKEN-API-AND-DEAD-LINK-CLEANUP-V1` | k-cosmetics 3 · neture dead link 6 · kpa 1 · k-cos 1 · DEAD_API 2 |
| **D** DB 축 | `WO-O4O-LEGACY-APP-AXIS-TABLE-DROP-AND-THEME-ENTITY-RETIREMENT-V1` | `apps`/`app_usage_logs`/`app_instances` DROP migration (승인 필요) · `Theme` entity 제거 |
| **E** 패키지·앱 | `WO-O4O-ORPHAN-PACKAGE-AND-UNDEPLOYED-APP-DISPOSITION-V1` | §3 7 패키지 · §2 미배포 5 · `glucoseview-web` Cloud Run · 미도달 src |
| **F** 스크립트·설정 | `WO-O4O-DEAD-SCRIPT-AND-PM2-CONFIG-RETIREMENT-V1` | §6 NO_REF 15 · SCRIPT_ONLY 13 · api-server PM2 scripts · appearance-system cross-env · `apps/api-server/scripts/` 검증 |
| **G** 의존성·문서 | `WO-O4O-UNUSED-DEPENDENCY-AND-DOC-DRIFT-CLEANUP-V1` | §9 50 후보 (lockfile) · `docs/README.md` 수치 · cosmetics service-definition `ecommerce` 제거 |

---

## 14. 문서 정합 (CLAUDE.md §16)

발견 2건 (`docs/README.md` archive 수치 drift · `docs/services/cosmetics/service-definition.md` 존재하지 않는 `ecommerce` 앱) — 모두 내용 판정이 필요한 수정이므로 인라인 처리하지 않고 묶음 G 로 제안. SUPERSEDED 표기 0 · 링크 수정 0.

---

## 15. 한계 · UNKNOWN 목록 (33)

미배포 앱 5 (`web-account` · `forum-api` · `forum-web` · `page-generator` · `mobile-app`) · orphan 패키지 7 · tmp 묶음 14 (참조 문서 소유 WO 확인 필요) · `glucoseview-web` Cloud Run 잔존 1 · 로컬 agent port 격리 1 · kpa `/tablet` redirect 1 · admin `/admin/o4o-product-db/masters/new` 1 · `apps/api-server/scripts/` 참조 1 · `@o4o/screen-content-core` Dockerfile 필요성 1 · `@tiptap/pm` peer 1.

정적 분석의 한계: raw-source spec (`readFileSync`) 소비자와 문자열 조립 route 는 import graph 에 나타나지 않으므로 각 정비 WO 에서 `scripts/quality/check-literal-consumers.mjs` 로 재확인해야 한다.

---

## 16. 최종 판정

```text
ACTIVE_CANONICAL_SURFACES        = 8      (배포된 앱·서비스 단위; 패키지 KEEP 50 은 §3)
DUPLICATED_ACTIVE_SURFACES       = 3      (admin 대시보드 3중 · admin API client 3계열 · channel-products 4중 mount)
DEAD_RUNTIME_SURFACES            = 133    (미도달 src: api-server 23 + admin 15 + neture 1 + packages 90 · DEAD_API 2 · DEAD_ENTITY 1 · DEAD_UI 1)
BROKEN_UI_API_SURFACES           = 61     (BROKEN_UI_API admin 17 + k-cosmetics 3 · dead link 41)
ORPHAN_PACKAGES                  = 7
ORPHAN_DB_AXES                   = 3      (apps · app_usage_logs · app_instances)
TRACKED_GENERATED_ARTIFACTS      = 62     (auth-client/src 28 + forum-core/src 34)
DEAD_SCRIPTS_AND_CONFIGS         = 30     (NO_REF 15 + SCRIPT_ONLY 13 + PM2 config 1 + POSIX env script 1)
TRACKED_TMP_FILES                = 169
UNKNOWN_REQUIRING_DECISION       = 33
SECURITY_CRITICAL_FINDINGS       = 0
IMMEDIATE_STOP_CONDITIONS        = 0

REPOSITORY_WIDE_LEGACY_CENSUS
  = COMPLETE_WITH_UNKNOWNS
```
