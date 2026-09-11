# CHECK — O4O Admin Dashboard Legacy Route · API · Navigation Closure V1

> **WO**: `WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1`
> **선행 IR**: [`IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1`](../investigations/IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1.md) §4 (admin BROKEN_UI_API 17 · dead link 33 · 대시보드 3중 · DynamicRouteLoader)
> **작성일**: 2026-09-11
> **상태**: CLOSED_WITH_DEFERRALS (코드 마감 완료 · DEFER 는 §12 에 명시)

---

## 0. 요약

admin-dashboard 를 **실제로 존재하는 운영 기능만 남는 canonical admin surface** 로 정리했다.

```text
ADMIN_CANONICAL_ENTRY         = PASS   (/admin · /home,/dashboard → /admin redirect)
BROKEN_ADMIN_API_SURFACES     = 0      (17 → FIX 5 · REMOVE 11 · DEFER 1, §6)
ADMIN_DEAD_LINKS              = 0      (33 → 화면 제거 30 · 링크 수정 2 · 컴포넌트 제거 1, §7)
FAKE_ADMIN_DATA               = 0      (하드코딩 통계 · 가짜 뉴스/활동 피드 · 0 고정 카드 전부 제거, §8)
DUPLICATED_ADMIN_DASHBOARDS   = 0      (AdminHome · UnifiedDashboard · phase2.4 제거, §3)
ADMIN_API_PREFIX_DRIFT        = 0      (ai/* · users approve/reject · media upload · cpt 연결 + smoke 발견 settings/email · signage 2건, §5)
STUB_NAVIGATION_DEPENDENCY    = 0      (useAdminMenu → 정적 SSOT 만, backend stub 제거, §9)
OTHER_SERVICE_REGRESSION      = PASS   (api-server typecheck · 다른 앱 소스 접촉 0)
SCHEMA CHANGE                 = 0
PRODUCTION_SMOKE              = PASS   (§11 — run 3 기준 · 잔여 backend 500 1건은 DEFER D8)
```

---

## 1. 시작 SHA · 작업 환경

| 항목 | 값 |
|---|---|
| 시작 기준 | `origin/main` `e0a8e96c8` (IR 전역 census 커밋) |
| 전용 worktree / branch | `C:/tmp/o4o-admin-legacy-closure` · `work/admin-dashboard-legacy-closure-v1` |
| 병렬 세션 점유 확인 | 다른 worktree(`o4o-wt-local-agent`)에 **미추적** `apps/admin-dashboard/src/pages/dashboard/business/` 존재 — 본 세션은 그 worktree 를 접촉하지 않았다. 본 worktree 에서 `pages/dashboard/` 는 tracked 파일(unified · phase2.4)만 제거했다 |
| stage 방식 | path-specific (`git add -- apps/admin-dashboard/src apps/api-server/src` → `check-staged-scope.mjs` ✅ 115건 범위 내 → `git commit -- <paths>`) · `git add .` 미사용 · force-push 없음 |
| 자격정보 | 터미널 · 문서 · diff · 커밋 어디에도 기록 0 |

---

## 2. Surface census (판정표)

컬럼: 경로 · UI 진입 · 메뉴 노출 · route 존재 · backend 존재 · API prefix · 실데이터 · 권한 · production 사용(30d gcloud 로그, read-only) · 판정

### 2-1. 대시보드 · 진입점

| 경로 | UI 진입 | 메뉴 | route | backend | prefix | 실데이터 | 권한 | prod 사용 | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| `/admin` `AdminDashboard` | 로그인 후 기본 · `/` → `/admin` | dashboard | ✅ | 메뉴 SSOT (API 없음) | — | 하드코딩 통계 · `href="#"` 뉴스 | super_admin | ✅ | **CANONICAL_KEEP** (재작성) |
| `/home` `AdminHome` | 딥링크 · Login 기본값 | ✗ | ✅ | ✗ (dead link 23) | — | 가짜 활동 피드 · 통계 | super_admin | 0 hits | **MERGE_DUPLICATED_DASHBOARD** → redirect |
| `/dashboard` `UnifiedDashboard` | 딥링크 | ✗ | ✅ | API 주석 처리 · 0 고정값 | — | PLACEHOLDER | super_admin | 0 hits | **MERGE_DUPLICATED_DASHBOARD** → redirect |
| `/admin/dashboard/operations` phase2.4 | 딥링크 | ✗ | ✅ | `/admin/dashboard/*` 없음 | v1 | ✗ | super_admin | 0 hits | **MERGE_DUPLICATED_DASHBOARD** → 제거 |
| `/admin/platform/hub` | 메뉴 | platform-hub | ✅ | ✅ | v1 | ✅ | super_admin | ✅ | CANONICAL_KEEP (목적 다름 = 플랫폼 전역 집계) |

### 2-2. 정적 메뉴 22 항목 (clickable path 23)

| 메뉴 id | path | route | backend | 판정 |
|---|---|---|---|---|
| dashboard | `/admin` | ✅ | — | CANONICAL_KEEP |
| platform-hub | `/admin/platform/hub` | ✅ | ✅ `/api/v1/platform/hub/*` | CANONICAL_KEEP |
| core-users | `/users` | ✅ | ✅ `/api/v1/users` · `userRole` | CANONICAL_KEEP (approve/reject 만 CONNECT, §5) |
| core-operators | `/operators` | ✅ | ✅ | CANONICAL_KEEP |
| core-kpa-branch-service-members | `/admin/kpa-branch/service-members` | ✅ | ✅ `/api/v1/kpa-branch/admin/service-members` | CANONICAL_KEEP |
| core-points | `/operator/points` | ✅ | ✅ | CANONICAL_KEEP |
| core-settings | `/settings` (+ `/settings/*` 내부 router) | ✅ | ✅ `/api/v1/settings` (cache/clear · oauth/test 만 없음 → 제거) | CANONICAL_KEEP |
| o4o-product-db ×7 | `/admin/o4o-product-db/{overview,candidates,store-requests,masters,supplier-store-descriptions,image-quality,maintenance}` | ✅ (nested) | ✅ | CANONICAL_KEEP |
| content ×4 | `/content`, `/content/{assets,policies,analytics}` | ✅ | ✅ | CANONICAL_KEEP |
| cms ×2 | `/admin/cms/{contents,slots}` | ✅ | ✅ (첨부 업로드만 CONNECT, §5) | CANONICAL_KEEP |
| ops-metrics | `/admin/ops/metrics` | ✅ | ✅ | CANONICAL_KEEP |
| appstore-browse | `/apps/store` | ✅ | ✅ `/api/v1/apps` | CANONICAL_KEEP |
| digital-signage-content | `/admin/digital-signage/content` | ✅ | ✅ | CANONICAL_KEEP |

메뉴 22 항목 중 **제거 대상 0** — 메뉴 SSOT 는 이미 정합했고, 문제는 메뉴 밖 딥링크·route·API client 쪽이었다.
새 spec 이 "모든 메뉴 path 에 route 존재" 를 23건 개별 케이스로 고정한다.

### 2-3. 메뉴 밖 route (딥링크 전용) 판정

| route | 화면 | backend | prod 30d | 판정 |
|---|---|---|---|---|
| `/admin/orders`, `/admin/orders/:id` (`commerce.routes`) | OrderList/Detail | `/api/v1/admin/orders` 없음 (`/api/admin/orders` non-v1 만) | 0 | **REMOVE_BROKEN_UI** (Store Commerce Boundary §9 legacy; backend `/api/admin/orders` 처분은 commerce 경계 별도 WO) |
| `/appearance/menus/*` | `pages/menus/*` | `/api/menus/*` 없음 | 0 | REMOVE_BROKEN_UI |
| `/appearance/template-parts` | TemplateParts | 없음 | 0 | REMOVE_BROKEN_UI |
| `/cpt-engine/presets/{forms,views,templates}` | presets | `/presets/*` 없음 | 0 | REMOVE_BROKEN_UI |
| `/admin/test/seed-presets`, `/admin/test/preset-integration` | test | 없음 | 0 | REMOVE_BROKEN_UI |
| `/tools`, `/tools/media-replace` | ToolsPage · MediaFileReplace | 없음 | 0 | REMOVE_BROKEN_UI |
| `/media/*` (Media · MediaUpload · MediaLibraryAdmin) | `/content/media/*` 없음 | 0 | **REMOVE_BROKEN_UI + redirect** → `/content-resource/media-assets` (canonical media-library) |
| `/mail/*` (MailManagement · EmailTemplates · EmailLogs) | 없음 | 0 | **REMOVE_BROKEN_UI + redirect** → `/settings/email` |
| `/enrollments`, `/admin/enrollments` | EnrollmentManagement | `/admin/enrollments*` 없음 | 0 | REMOVE_BROKEN_UI |
| `/admin/role-applications` | RoleApplicationsAdminPage | `/admin/roles/applications*` 없음 | 0 | REMOVE_BROKEN_UI |
| `/storefront/*` | StorefrontRouter (5 화면) | 소비자 commerce (Boundary §2 금지선) | 0 | REMOVE_BROKEN_UI |
| `/error/app-disabled` | ErrorPage | — | — | CANONICAL_KEEP (AppGuard 착지) |
| `/admin/test/*` (AuthDebug · AIPageGeneratorTest · AIBlockDebug) | test | prod 게이트 | — | CANONICAL_KEEP (TEST_GUARD_ONLY, IR §4-1) |

---

## 3. Canonical entry · 중복 dashboard

```ts
// apps/admin-dashboard/src/routes/dashboard.routes.tsx
export const CANONICAL_ADMIN_HOME = '/admin';
```

| 경로 | 이전 | 이후 |
|---|---|---|
| `/admin` | `AdminDashboard` (하드코딩 통계 · 가짜 뉴스) | **`AdminDashboard` 재작성** — `useAdminMenu` 의 메뉴 SSOT 를 섹션 카드로 렌더 (`data-testid="admin-home-section-<id>"`, 버전 `admin-version`) |
| `/home` | `AdminHome` | `<Navigate to={CANONICAL_ADMIN_HOME} replace />` |
| `/dashboard` | `UnifiedDashboard` | `<Navigate to={CANONICAL_ADMIN_HOME} replace />` |
| `/admin/dashboard/operations` | phase2.4 `OperationsDashboard` | route · 파일 제거 |
| `/` | `/admin` (기존) | 유지 |
| `Login.tsx` 기본 이동 | `'/home'` | `'/admin'` |
| 404 | `/` (기존) | 유지 |

세 dashboard 의 business 목적이 다른지(중지 조건 2) 검토: `AdminHome`·`UnifiedDashboard` 는 실데이터 0 (dead link · 0 고정값) 으로 "목적" 이 성립하지 않는다 → 제품 결정 불필요, 병합. `platform/hub` 는 실데이터가 있는 별개 목적(플랫폼 전역 집계)이라 유지.

제거: `pages/AdminHome.tsx` · `pages/dashboard/unified/**` (18) · `pages/dashboard/phase2.4/**` (6) · `hooks/api/useDashboard.ts`.

---

## 4. 제거 메뉴 · route · 파일

- 메뉴 제거: **0** (§2-2)
- route 제거: §2-3 REMOVE_BROKEN_UI 전부 + `routes/commerce.routes.tsx` 파일 자체 제거(`App.tsx` mount 제거)
- redirect 추가: `/home` · `/dashboard` · `/media/*` · `/mail/*`
- 파일 제거 78 (admin 76 + api-server 2), 수정 36, 신규 spec 1 — 115 파일 · +663 / −21,124

dead component/helper/export 제거 (소비처 0 확인 후):
`components/routing/**` · `lib/widgets/**` · `api/menuApi.ts` · `api/presets.ts` · `utils/seedPresets.ts` · `components/presets/**` · `hooks/useKeyboardShortcuts.ts` · `hooks/useRoleApplicationsCount.ts` · `components/widgets/PendingApplicationsWidget.tsx` · `components/guards/GlucosecareParticipationNotice.tsx` · `pages/users/components/BusinessInfoSection.tsx` · `userApi.migrateUserRoles` · `settings.clearCache` · `store-content.api.trackEvent` · `rolePermissions.{fetchRolesFromDatabase,fetchUserPermissions}` · `types/user.fetchAvailableRoles` · OAuth test 주석 블록 · `PartnerListPage` 삭제/상태변경 mutation.

---

## 5. API prefix 정리 (backend 계약 = 진실, 새 endpoint 0)

| 호출처 | 이전 (404) | 이후 | backend 근거 |
|---|---|---|---|
| `AiQuerySettings` | `authClient.api` `/ai/policy` → `/api/v1/ai/policy` | `unifiedApi.raw.get/put('/ai/policy')` → `/api/ai/policy` | `register-routes.ts` `app.use('/api/ai', aiQueryRoutes)` |
| `SimpleAIGenerator` | `/api/v1/ai/generate` | `unifiedApi.raw.post('/ai/generate')` | `app.use('/api/ai', aiProxyRoutes)` |
| `userApi.approve/reject` | `/api/v1/admin/users/:id/approve|reject` | `unifiedApi.raw.post('/v1/users/:id/approve|reject', {notes})` | `users.routes.ts` `'/:id/approve'` · `'/:id/reject'` |
| `ContentFormModal` 첨부 | `mediaApi.upload` → `/api/v1/content/media/upload` | `uploadImageForEditor(file,'cms')` → `POST /api/v1/platform/media-library/upload` (accept 에서 `.zip` 제거 — backend MIME 허용 외) | `media-library.api.ts` |
| `CPTDashboardToolset` | `acfGroupApi.getAll` → `/cpt/custom-post-types`… | `fieldGroupApi.getAll()` → `/api/v1/cpt/field-groups` | `cpt.api.ts` |
| `acf.api.getPostTypes/getTaxonomies` | `/cpt/custom-post-types` · `/taxonomies` | `/cpt/types` · `/cpt/taxonomies` | `/api/v1/cpt/*` |

**production smoke(§11) 에서 추가 발견·수정 2건** (commit `fef2af4df`):

| 호출처 | 이전 (404) | 이후 | backend 근거 |
|---|---|---|---|
| `api/settings.ts` (`pages/settings/EmailSettings`) | `unifiedApi.raw` `/settings/email` → `/api/settings/email` | `apiEndpoints.settings.email = '/v1/settings/email'` → `/api/v1/settings/email` | `register-routes.ts:161` `app.use('/api/v1/settings', settingsRoutes)` · `settingsRoutes.ts` `GET/PUT /:type` |
| `lib/api/signageV2.ts` (`digital-signage/v2/ContentHub`) | `authClient.api` + `/api/signage/neture/global/playlists/hq` → `/api/v1/api/signage/...` | `unifiedApi.raw` + `/signage/:serviceKey/global/{playlists,media}/:source` | `register-routes.ts:1049` `app.use('/api/signage/:serviceKey', signageRoutes)` · `signage.routes.ts` `/global/playlists/:source` `/global/media/:source` |

같은 commit 에서 backend 부재 helper 를 제거했다 — `settings.ts` appearance/integration/security/all/export/import/reset/uploadLogo/testEmailSettings (소비처: `EmailSettings` 의 "테스트 이메일 발송" 카드 1곳 → `POST /settings/email/test` 부재이므로 카드째 REMOVE_BROKEN_UI), `signageV2.ts` playlistApi/signageMediaApi/signageScheduleApi/templateApi (소비처 0, 837→473 lines).

API client 3계열(`unifiedApi.raw` base `/api` · `authClient.api` base `/api/v1` · `apiV1Client`) 은 통합하지 않았다(WO §7 범위 밖 — client 통합은 구조 변경). `admin-operation-boundary.test.ts` 의 접두 중복 allowlist `KNOWN` 은 `[]` 로 비웠다.

외부/public API contract 접촉: **0** (중지 조건 3 해당 없음).

---

## 6. BROKEN_UI_API 17 결과

| # | IR 항목 | 판정 | 처리 |
|---|---|---|---|
| 1 | OrderDetailPage `/admin/orders` | REMOVE_UI | commerce.routes 제거 (§2-3) |
| 2 | phase2.4 operations | REMOVE_UI | §3 |
| 3 | `pages/menus` `/api/menus` | REMOVE_UI | 제거 |
| 4 | presets | REMOVE_UI | 제거 |
| 5 | `acf.api.ts` | **부분 FIX** (`/cpt/types` · `/cpt/taxonomies`) + **DEFER** (location-rule `/roles` `/posts/categories` `/templates/*` `/taxonomies/:p/terms`, ACF export/import — cpt-engine 별도 WO) | §12 |
| 6 | RoleApplicationsAdminPage | REMOVE_UI | 제거 |
| 7 | TemplateParts | REMOVE_UI | 제거 |
| 8 | MediaFileReplace | REMOVE_UI | 제거 |
| 9 | Media 화면 `/content/media/*` | REMOVE_UI + redirect | `/media/*` → `/content-resource/media-assets` |
| 10 | EnrollmentManagement | REMOVE_UI | 제거 |
| 11 | registerWidgets | REMOVE_UI | `lib/widgets` 제거 |
| 12 | userApi approve/reject/suspend/reactivate | FIX_TO_EXISTING_BACKEND (approve/reject) · REMOVE (suspend/reactivate 주석 블록) | §5 |
| 13 | settings cache/clear · oauth/test | REMOVE_UI | helper · Test 버튼 제거 |
| 14 | store-content trackEvent | REMOVE_UI | 제거 |
| 15 | BusinessInfoSection | REMOVE_UI | 제거 (UserDetail · UserForm 에서 분리) |
| 16 | AI `/api/v1/ai/*` | FIX_TO_EXISTING_BACKEND | §5 (`BlockCodeGenerator` 는 editor 도메인 DEFER, §12) |
| 17 | PartnerListPage status/delete | REMOVE_UI | 읽기 전용 목록으로 (편집 Link 유지) |

**BROKEN_ADMIN_API_SURFACES = 0** — 예외 = §12 DEFER (editor block 도메인 · cpt-acf location rule) 는 admin 메뉴로 도달하는 화면이 아니며 IR 에서도 "동일 BROKEN 계열 (3·9 묶음)" 로 분리 기재됐다.

api.mjs 재실행 결과 admin 미매칭 잔여는 (a) `unifiedApi.raw` base 를 스크립트가 `/api/v1` 로 가정해 생기는 `/api/v1/v1/...` · `/api/v1/ai/...` **스크립트 아티팩트** (실제 경로는 정합), (b) `/api/v1/:p/admin/service-members` = `kpa-branch/admin/service-members` 실존 (파라미터 오탐), (c) §12 DEFER 뿐이다.

---

## 7. Dead link 33 결과

| 출처 | 건수 | 처리 |
|---|---|---|
| `AdminHome.tsx` · 구 `AdminDashboard.tsx` | 23 | 화면 제거 / 재작성 → 0 |
| `dashboard/unified/cards/*` | 6 | 화면 제거 → 0 |
| `AppGuard` `/admin/appstore` | 1 | `/apps/store` · `/apps/store?activate=<id>` 로 수정 |
| `SimpleAIModal` `/admin/settings/app-services` | 1 | `/settings/app-services` 로 수정 |
| `useKeyboardShortcuts` `/admin/products` | 1 | hook 제거 (소비처 0) |
| `GlucosecareParticipationNotice` `/apply` | 1 | 컴포넌트 제거 (소비처 0) |

links.mjs 재실행: dead target **1** = `/admin/o4o-product-db/masters/new` — 스캐너 오탐 (nested `masters/:id` 가 `masters/new` 보다 먼저 매칭; route 는 `o4o-product-db.routes.tsx:55` 에 실존). 새 spec 의 nested 확장 matcher 는 이 경로를 route 있음으로 판정한다.
**ADMIN_DEAD_LINKS = 0.** 404 를 가리는 placeholder 화면 추가 **0**.

---

## 8. Fake data 결과

| 항목 | 이전 | 처리 |
|---|---|---|
| `AdminDashboard` 하드코딩 KPI (24/8/156/42 · 1,234/8,765) | 표시 | 제거 — 실데이터 API 없음 → 숫자 자체를 표시하지 않음 (0 치환 없음) |
| `AdminDashboard` 플랫폼 뉴스 (`href="#"`) · Quick Draft 폼 | 표시 | 제거 |
| `AdminHome` 가짜 활동 피드 · 통계 | 표시 | 화면 제거 |
| `UnifiedDashboard` 0 고정 카드 (API 주석 처리) | 표시 | 화면 제거 |
| 배포 테스트 배너 | 표시 | 제거 |

새 spec: canonical home 에 `href="#"` 0 · 자릿수 구분 숫자 0 · `stats/news/activity/recentPosts/Quick Draft` 식별자 0.
**FAKE_ADMIN_DATA = 0.**

---

## 9. DynamicRouteLoader 판정

| 표면 | 판정 | 근거 · 처리 |
|---|---|---|
| `components/routing/{DynamicRouteLoader,ViewComponentRegistry,index}` | **DEAD_ABSTRACTION** | 어디에도 mount 안 됨(IR §4-1) · `App.tsx` 배럴 재수출만 → 디렉터리 제거 |
| `lib/widgets/{registerWidgets,widgetRegistry}` | DEAD_ABSTRACTION | 등록 대상 API 전부 부재 · `App.tsx` `registerAllWidgets()` 제거 |
| backend `routes/navigation.routes.ts` `/api/v1/navigation` | DEAD_ABSTRACTION (STUB) | 빈 응답 stub · prod 30d 125 hits 전부 `useAdminMenu` 자동 호출 → 파일 · mount 제거 |
| backend `routes/routes.routes.ts` `/api/v1/routes` | DEAD_ABSTRACTION (STUB) | 0 hits → 제거 |
| `useAdminMenu` | 재작성 | `/v1/navigation/admin` 호출 · `transformApiMenuItems` · `isUsingFallback` 제거 · 정적 SSOT + `injectCPTMenuItems` + `/v1/userRole/:id/permissions` 만 |

새 동적 route 시스템 도입 **0**. **STUB_NAVIGATION_DEPENDENCY = 0.**

---

## 10. 권한 회귀

- 메뉴 숨김 ≠ 인가: backend guard 무변경 (`register-routes.ts` 변경은 stub 2 mount 제거뿐). `users approve/reject` 는 기존 `users.routes.ts` guard 그대로.
- admin SPA floor `platform:super_admin` (AdminProtectedRoute) 무변경. `useAdminMenu` 의 `hasMenuPermission` 필터 로직 무변경 (`platform:super_admin` bypass 의도 그대로).
- role 모델 재설계 **0** (중지 조건 4 해당 없음).
- 기존 권한 spec (`admin-platform-only-access-and-post-refactor-closure` · `admin-authorization-registry-and-dead-surface-final-closure` · `admin-operation-boundary`) 전부 통과 (§13).

---

## 11. Production smoke

실 브라우저(Playwright MCP, `https://admin.neture.co.kr`) · 실제 admin 계정(사용자가 브라우저에서 직접 로그인, 자격정보는 tool 인자·로그·문서 어디에도 미기재) · SPA 내비게이션(`history.pushState` + `popstate`, 허브 카드 `a[href]` 클릭) · 캐시버스트 `?cb=`.

### 11-1. run 1 (`93f8ada00` 배포 직후) — FAIL → 수정

| 항목 | 결과 |
|---|---|
| `/content/assets` | **pageerror** `TypeError: Failed to resolve module specifier "typeorm"` — `ContentAsset-*.js` 청크가 `@o4o-apps/content-core` 배럴(entities → typeorm) 을 브라우저에 끌어옴. ErrorBoundary 가 이후 모든 화면·redirect 검사를 오염 (main 에 원래 있던 문제, 본 WO 가 `/content/assets` 를 메뉴에 남기면서 드러남) |
| 수정 | Content 5 파일 `@o4o-apps/content-core` → `@o4o-apps/content-core/types` (commit `160ae92d8`, Deploy Admin Dashboard success, entry chunk `index-DkLMsY72.js`) |

### 11-2. run 2 (`160ae92d8` 배포 후, 재로그인)

| WO §15 항목 | 결과 |
|---|---|
| canonical home `/admin` | h1 `관리자 홈` · `admin-home-section-*` 7 (`platform-hub, core, o4o-product-db, content, cms, appstore, digital-signage-content`) · 하드코딩 통계/뉴스/배너 0 |
| 메뉴 22 path 클릭 | **22/22 h1 렌더** · ErrorBoundary 0 · notFound 0 (`/users` 의 notFound 플래그 1건은 데이터 문자열 `@check-regression-121404` 오탐, 화면 정상) |
| 404 / blank | 0 |
| console error / pageerror | pageerror 0 · console error = 아래 네트워크 4xx/5xx 의 axios 로그만 |
| fake KPI / news | 0 |
| redirect | 6/6 (`/home` `/dashboard` → `/admin` · `/media` `/media/library` → `/content-resource/media-assets` · `/mail` `/mail/templates` → `/settings/email`) |
| 권한 메뉴 노출 | super_admin 사이드바 top-level 링크 `/admin` `/admin/platform/hub` `/admin/digital-signage/content` + 접이식 그룹(core · o4o-product-db · content · cms · appstore) |
| unexpected 4xx/5xx | **4건** → 아래 |

| 요청 | 상태 | 원인 | 처리 |
|---|---|---|---|
| `GET /api/settings/email` ×2 | 404 | prefix drift (`unifiedApi.raw` + `/settings/...`) | **FIX** `fef2af4df` (§5) |
| `GET /api/v1/api/signage/neture/global/playlists/hq` | 404 | prefix drift (`authClient.api` + `/api/signage/...`) | **FIX** `fef2af4df` (§5) |
| `GET /api/v1/content/assets?limit=100` · `/stats` | **500** | Cloud Run stderr: `relation "cms_media" does not exist` — backend `content-assets.routes.ts` 가 프로덕션에 없는 테이블을 조회 (schema/migration 영역, WO §13 금지) | **DEFER D8** (§12). 화면은 에러 상태 렌더, blank/ErrorBoundary 아님 |

### 11-3. run 3 (`fef2af4df` 배포 후, entry chunk `index-MKw3wFbt.js`, 세션 유지) — **PASS**

| WO §15 항목 | 결과 |
|---|---|
| canonical home `/admin` | 섹션 7 · 하드코딩 통계/뉴스/배너 0 |
| 메뉴 22 path (허브 카드 링크 클릭 22/22 `via=true`) | **22/22 렌더** · ErrorBoundary 0 · 404/blank 0 |
| pageerror | **0** |
| console error | `content/assets` 500 의 axios 로그 4줄만 (아래 D8) — 그 외 0 |
| fake KPI / news | **0** |
| redirect | **6/6** |
| `GET /api/v1/settings/email` | **200** (`/settings/email` 화면 SMTP 폼 렌더 · "테스트 이메일 발송" 카드 없음). 최초 1회 401 → `POST /auth/refresh` 200 → 재요청 200 = 토큰 갱신 인터셉터 정상 동작, 오류 아님 |
| `GET /api/signage/neture/global/playlists/hq` | **200** (`/admin/digital-signage/content`) |
| unexpected 4xx/5xx | `GET /api/v1/content/assets?limit=100` · `/stats` **500** 2건만 = DEFER D8 (backend `cms_media` 부재, 화면은 에러 상태 렌더). 그 외 전 요청 2xx |
| 권한 메뉴 노출 | run 2 와 동일 (super_admin 사이드바 top-level `/admin` `/admin/platform/hub` `/admin/digital-signage/content` + 접이식 그룹 5) |

`PRODUCTION_SMOKE = PASS` — 단 D8 은 frontend 가 아닌 backend/schema 결함이므로 본 WO 범위(§13 SCHEMA CHANGE 금지) 밖으로 명시 이월한다.

### 11-4. smoke 중 관찰한 범위 밖 사항 (미수정 · 보고)

- `pages/auth/Login.tsx` 의 `✅ 배포 테스트 v3.0` 배너 — 로그인 화면(비인증 표면), 본 WO 의 admin 메뉴/route 범위 밖.
- `[data-testid=admin-version]` = `v0.5.0` (`config/version.ts` `VERSION_DISPLAY`) vs `document.title` `v0.5.9` — 버전 표기 2원화, 별도 정리 대상.
- 자격정보 처리 사고 1건: 테스트 계정 문서를 grep 하는 과정에서 비밀번호가 터미널 출력에 1회 노출됐다(사용자에게 즉시 보고). CHECK·diff·커밋·스크립트 어디에도 기록하지 않았고 이후 자격정보 읽기를 중단, 로그인은 사용자가 직접 수행했다.

---

## 12. 남은 DEFER (제품/도메인 결정 필요 · 본 WO 범위 밖)

| # | 항목 | 사유 | 제안 |
|---|---|---|---|
| D1 | `api/contentApi.ts` (`/admin/{menus,templates,custom-fields,stats,categories/reorder,utils/generate-slug}` · `/content/media/*`) — 소비처 `components/editor/blocks/{MarkdownBlock,shared/FileSelector,shared/MediaSelector}` | admin 메뉴로 도달하지 않는 **editor block 도메인**. backend 부재 = 블록 기능 자체의 존폐 결정 필요 | editor/blocks 처분 WO |
| D2 | `services/api/postApi.ts` (`/posts*` `/tags` `/categories` `/media` `/content/media/upload`) — 소비처 `editor/blocks/image/useImageUpload` · `pages/test/AIBlockDebug` | 동상 | D1 과 묶음 |
| D3 | `services/ai/BlockCodeGenerator.ts` (`authClient.api` `/ai/generate|save-block|saved-blocks`) — 소비처 `editor/blocks/PlaceholderBlock` | `/api/ai/save-block` 등 backend 존재 여부 · 블록 저장 기능 존폐가 editor 결정 | D1 과 묶음 |
| D4 | `features/cpt-acf/services/acf.api.ts` location-rule (`/roles` `/posts/categories` `/templates/{page,post}` `/taxonomies/:p/terms`) · ACF export/import | cpt-engine 의 location rule UI 가 WordPress 호환 개념 — 유지/제거는 cpt-engine 제품 결정 | cpt-engine 별도 WO |
| D5 | `store-content.api.getContentAnalytics` | backend 없음이나 null 시 숨김 처리되어 화면 오류 없음 — lms-marketing 도메인 | lms-marketing WO |
| D6 | backend `/api/admin/orders` (non-v1) | frontend 소비처 0 이 됐으나 commerce 경계 처분은 Store Commerce Boundary 기준 별도 WO | commerce 경계 WO |
| D7 | API client 3계열 통합 | 구조 변경 — WO §13 허용 범위 밖 | 별도 WO |
| D8 | backend `GET /api/v1/content/assets` · `/stats` 500 (`relation "cms_media" does not exist`) | 프로덕션 DB 에 `cms_media` 테이블 부재 — entity 는 `packages/cms-core/src/entities/CmsMedia.entity.ts` 에 있으나 생성 migration 이 저장소에 없다 (cms-core = 동결 Core §3, migration/schema 판단 필요, WO §13 SCHEMA CHANGE 금지). frontend 는 실존 route 를 정합하게 호출하고 있어 CONNECT_TO_EXISTING_BACKEND 로 유지 | content-core migration 상태 조사 IR → 필요 시 migration WO |

D1~D3 은 프로덕션 admin 메뉴에서 도달할 수 없다 (editor 는 cms/content 화면 내부 블록에서만 로드). 본 WO 의 BROKEN_ADMIN_API_SURFACES = 0 은 "메뉴 도달 화면 기준" 이며 이 예외를 여기 명시한다.

---

## 13. 회귀 · CI · commit SHA

### 13-1. 로컬 회귀 (worktree, rebase 후 재실행)

| 항목 | 결과 |
|---|---|
| 새 spec `admin-legacy-route-api-and-navigation-closure.test.ts` | **72/72 pass** (canonical entry 4 · 메뉴↔route 24 · 중복 dashboard 4 · fake data 2 · DynamicRouteLoader 4 · stub 의존 2 · prefix 정합 6 · REMOVE_BROKEN_UI 26) |
| admin-dashboard vitest 전체 | **16 files · 385/385 pass** |
| admin-dashboard `tsc --noEmit` | pass |
| admin-dashboard `vite build` | pass (19.5s) |
| admin-dashboard eslint | 0 error (warning 403 = 기존, 본 WO 신규 0) |
| api-server `tsc --noEmit` | pass |
| 제거 모듈 stale import grep (src 전체, tests 제외) | 0 |

### 13-2. commit · CI

| 항목 | 값 |
|---|---|
| 구현 commit | `93f8ada00` (rebase 전 `cc9bf485a`) — `refactor(admin,api): admin-dashboard legacy route·API·navigation 마감 …` |
| smoke 후속 commit | `160ae92d8` content-core `/types` 서브패스 전환 (5 파일) · `fef2af4df` prefix drift 2건 + 테스트 이메일 UI 제거 (4 파일) |
| push | `e5d86d23a..93f8ada00` · `..160ae92d8` · `..fef2af4df` `HEAD -> main` (force 없음) |

CI / Deploy (GitHub Actions, `gh run list` 기준 — cancelled 는 success 로 간주하지 않는다):

| SHA | CI Pipeline | CodeQL | Deploy Admin Dashboard | Deploy API Server |
|---|---|---|---|---|
| `93f8ada00` | **cancelled** (후속 push 로 취소) | cancelled | success | success |
| `160ae92d8` | **failure** — `Code Quality Check` 의 api-server Jest `windows-app-window-control.spec.ts` · `ai-capability-tool-routing.spec.ts` (local-agent 도메인, 본 WO 미접촉. 본 WO 이전 `e0a8e96c8` `185dea3e9` `e5d86d23a` 에서도 동일 failure) | success | success | (변경 없음) |
| `fef2af4df` | (§13-3) | (§13-3) | (§13-3) | (변경 없음) |

로컬에서는 admin-dashboard 전체 vitest 385/385 · api-server tsc 통과(§13-1). 위 CI failure 는 본 WO 변경과 무관한 기존 실패이며 별도 정리 대상으로 보고한다.

### 13-3. `fef2af4df` CI · Deploy

| workflow | 결과 |
|---|---|
| Deploy Admin Dashboard (Cloud Run) | **success** (smoke run 3 는 이 배포 기준) |
| CodeQL Security Analysis | success |
| CI Pipeline | CHECK 커밋 시점 in_progress — 직전 `160ae92d8` 과 동일하게 api-server Jest 기존 failure(§13-2) 로 실패할 것으로 예상하며, 결과는 확정된 값만 최종 보고에 기재한다 |
