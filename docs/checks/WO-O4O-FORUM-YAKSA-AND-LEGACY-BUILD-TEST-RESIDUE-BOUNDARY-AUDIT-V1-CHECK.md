# WO-O4O-FORUM-YAKSA-AND-LEGACY-BUILD-TEST-RESIDUE-BOUNDARY-AUDIT-V1 — CHECK

> `forum-yaksa`, 잔여 Vite alias, 멀티테넌트 테스트 fixture 의 실제 소비 경계를 확인하는 **read-only 감사**.
> 이번 작업에서는 코드·설정·운영 DB·schema·migration·seed·배포를 변경하지 않았다.

- **판정: `PASS`**
- 작성일: 2026-08-06
- 선행 작업: `WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1` (판정 `PASS_WITH_HOLD`)

---

## 1. 기준 branch · HEAD · origin/main · ahead/behind

| 항목 | 값 |
|---|---|
| branch | `main` |
| HEAD (감사 종료 시점) | `1c3ae52ec4966306f07facc46ed000e2d8474552` |
| origin/main | `1c3ae52ec` |
| ahead / behind | **0 / 0** |

감사 착수 시점 HEAD 는 `c0e08073`(= 당시 origin/main) 이었고, 감사 도중 타 세션이 HFF ZH 작업을 커밋해 `1c3ae52ec` 로 전진했다. 감사 대상 파일은 그 커밋 범위에 포함되지 않는다.

## 2. 시작 작업 트리와 타 세션 WIP

착수 시점 작업 트리는 clean 이었으나, 감사 진행 중 타 세션의 HFF ZH WIP 가 나타났다.

```
 M apps/api-server/src/scripts/hff-zh-b01-translate.mjs
?? apps/api-server/src/scripts/data/hff-zh-b04-z82-translations-v1.json
?? apps/api-server/src/scripts/data/hff-zh-nsa-atoms-v1.json
?? apps/api-server/src/scripts/data/hff-zh-nsa-markhead-regress-v1.json
?? apps/api-server/src/scripts/data/hff-zh-nsa-scan-v1.json
?? apps/api-server/src/scripts/hff-zh-nsa-atoms.mjs
?? apps/api-server/src/scripts/hff-zh-nsa-markhead-regress.mjs
?? apps/api-server/src/scripts/hff-zh-nsa-probe3.mjs
?? apps/api-server/src/scripts/hff-zh-nsa-scan.mjs
```

전부 `apps/api-server/src/scripts/**` 로, 본 감사의 조사 대상(`packages/forum-yaksa`, `apps/admin-dashboard/vite.config.ts`, `apps/api-server/tests/multi-tenant/**`)과 **직접 겹치지 않는다.** WO 중지 조건("타 세션 WIP 와 조사 대상 파일이 직접 겹침")에 해당하지 않아 감사를 계속했고, 해당 파일은 수정·삭제·stash·commit 하지 않았다.

## 3. 선행 commit 포함 여부

| commit | 결과 |
|---|---|
| `ab5570573` (구현) | **ANCESTOR — 포함됨** |
| `5a6c3d5aa` (CHECK §20 보완) | **ANCESTOR — 포함됨** |

## 4. `forum-yaksa` 전체 참조 모집단

`node_modules` / `dist` / `dist-node` / `dist-ssr` / `build` / `coverage` 를 제외한 실행 가능 참조 전수.

### 4-1. 패키지 자체 (tracked 파일)

`packages/forum-yaksa` — 35 파일 (`.map` 제외). `apps/api-server/packages/forum-yaksa/package.json` 1 파일.

- 매니페스트: `manifest.json`, `src/manifest.ts` (+ 커밋된 `src/manifest.js`)
- admin UI: `src/admin-ui/pages/{ForumYaksaApp, YaksaCommunityDashboard, YaksaCommunityList, YaksaCommunityDetail, YaksaCommunityFeed}.tsx` + `index.ts`
- backend: `src/backend/{entities,services}/**`, `src/backend/routes/{index.ts, yaksa.search.routes.ts}`, `src/backend/index.ts`
- lifecycle: `src/lifecycle/{install,uninstall,activate,deactivate,index}.ts`
- migrations: `src/migrations/00{1,2,3}-*.ts`

### 4-2. 카탈로그 · 서비스 그룹 · 템플릿

| 위치 | 내용 |
|---|---|
| `apps/api-server/src/app-manifests/appsCatalog.ts:364` | `appId: 'forum-yaksa'` 카탈로그 항목 (`serviceGroups: ['yaksa']`, `dependencies: { 'forum-core': '>=1.0.0' }`) |
| `apps/api-server/src/app-manifests/forum-yaksa.manifest.ts` | 앱 매니페스트 (view `forum-yaksa-dashboard`) |
| `apps/api-server/src/service-groups/index.ts:297,320,359,421` | `cosmetics.incompatibleApps` / `extensionRules.incompatible` / `yaksa.requiredCoreApps` |
| `apps/api-server/src/services/app-manager/app-manager.types.ts:21` | 타입 union 항목 |
| `apps/api-server/src/services/service-monitor.service.ts:514` | 모니터 대상 목록 |
| `apps/api-server/src/service-templates/templates/yaksa-branch.json:8` | 템플릿 앱 목록 |
| `apps/api-server/src/service-templates/validators/template-linter.ts:53,74` | 린터 화이트리스트 |
| `bundles/yaksa.bundle.json:29,65` | 번들 `apps[]` (`required: true`) 및 `installOrder` |

### 4-3. Package dependency · build · deploy

| 위치 | 내용 |
|---|---|
| `apps/api-server/package.json:118` | `"@o4o-apps/forum-yaksa": "workspace:*"` |
| `tsconfig.json:53` | project reference `{ "path": "./packages/forum-yaksa" }` |
| `.github/workflows/deploy-api.yml:101` | `pnpm --filter '@o4o-apps/forum-yaksa' run build \|\| true` |
| `scripts/dev.mjs:148,197` | `const appStorePackages = ['forum-app', 'forum-neture', 'forum-yaksa'];` |
| `apps/api-server/scripts/bootstrap-install-apps.{ts,mjs}` | 설치 대상 목록에 `'forum-yaksa'` 포함 |

### 4-4. Frontend

| 위치 | 내용 |
|---|---|
| `apps/admin-dashboard/vite.config.ts:43` | alias `'@o4o/forum-core-yaksa' → packages/forum-yaksa` |
| `apps/admin-dashboard/vite.config.ts:103` | `optimizeDeps.exclude` 항목 |
| `apps/admin-dashboard/src/routes/apps.routes.tsx:13–31, 118–145` | 동적 import 3건 + route 3건 |
| `apps/main-site/src/appstore/registry.ts:66,69,70` | `manifestPath: '@o4o/forum-core-yaksa/manifest.json'`, `packageName` |
| `apps/main-site/src/appstore/manifestLoader.ts:33,174,175` | folderName 매핑 + stub manifest |

### 4-5. Test

| 위치 | 내용 |
|---|---|
| `apps/api-server/tests/multi-tenant/appstore.spec.ts` | 12 라인 15 assertion |
| `apps/api-server/tests/multi-tenant/setup.ts:332` | `vRegistry.registerView('yaksa.post.list', …, 'forum-yaksa')` |

### 4-6. 문서·주석 전용 (실행 참조 아님)

`packages/forum-core/src/backend/services/forum.search.service.ts:39` · `packages/forum-core/src/backend/types/index.ts:173` · `packages/forum-core/TODO.md:102` · `packages/organization-core/TODO.md:82` · `scripts/appstore-guard.ts:288` · `bundles/README.md:101` · `tmp/forum_yaksa_install.sql` · `packages/forum-yaksa/TODO.md`

## 5. KPA Society 포럼의 현재 실행 흐름

| 단계 | 실제 구현 위치 |
|---|---|
| API mount (공용) | `apps/api-server/src/bootstrap/register-routes.ts:161` → `app.use('/api/v1/forum', forumRoutes)`, import 는 `:33` `routes/forum/forum.routes.js` |
| API mount (KPA) | `register-routes.ts:865` → `app.use('/api/v1/kpa', kpaRoutes)` (`src/routes/kpa/kpa.routes.ts`, 하위 `controllers/services/entities/middleware`) |
| 프런트 API 클라이언트 | `services/web-kpa-society/src/api/forum.ts` — base `/forum`, `client.ts` 가 `/api/v1/kpa` prefix 부가 → 실제 `/api/v1/kpa/forum/*` |
| 포럼 생성·작성 | `services/web-kpa-society/src/pages/forum/ForumWritePage.tsx` |
| 목록·상세·피드 조회 | `pages/forum/{ForumListPage, ForumDetailPage, ForumFeedPage, ForumHomePage}.tsx` |
| 사용자 접근·차단 | `components/forum/ClosedForumAccessBlocker.tsx` |
| 운영자 관리 화면 | `pages/operator/{OperatorForumPage, ForumRequestsManagementPage, ForumCategoriesManagementPage, ForumDeleteRequestsPage, ForumAnalyticsDashboard}.tsx` |
| 회원·내 포럼 관리 | `pages/mypage/{ForumMemberManagementPage, MyForumDashboardPage}.tsx` |
| 서비스·tenant 식별 | scope `community` (organizationId IS NULL) — `api/forum.ts` 주석의 `WO-FORUM-SCOPE-FIX` 계약 |

**이 흐름 전체에 `forum-yaksa` 는 등장하지 않는다.** `services/**` 및 `apps/main-site/src/**`(appstore 카탈로그 제외) 전수 grep 결과 `forum-yaksa` / `forum-core-yaksa` 참조 0건.

## 6. `forum-yaksa` 의 실제 역할과 소비처

### 6-1. Backend — 라우트가 존재하지 않는다

- `packages/forum-yaksa/src/manifest.ts:51` 은 `routesExport: 'createRoutes'` 를 선언한다.
- 그러나 `packages/forum-yaksa/src/backend/index.ts` 는 **`createRoutes` 를 export 하지 않으며**, 파일 상단 주석이 명시한다: *"Extension package - provides entities and services only, **no routes**"*. export 는 `entities` / `services` 뿐이다.
- 유일한 라우트 파일 `src/backend/routes/yaksa.search.routes.ts` 는 `createYaksaSearchRoutes` 로만 export 되고, 이를 mount 하는 코드가 저장소 어디에도 없다.
- 로드 경로 자체도 `moduleLoader.loadAll()` (`register-routes.ts:195`) 의 `packages/**/manifest.ts` 스캔 뿐이며 `autoActivate: false` 이고, 프로덕션 이미지에는 `packages/` 가 포함되지 않는다.

### 6-2. Admin UI — 존재하는 API 를 호출하지 않는다

`admin-ui/pages` 3종이 호출하는 경로는 다음과 같다.

- `YaksaCommunityList.tsx:27` · `YaksaCommunityDashboard.tsx:66` — `/yaksa/forum/communities/mine`
- `YaksaCommunityDashboard.tsx:73` — `/yaksa/forum/communities/feed/all`
- `YaksaCommunityDetail.tsx:44,51` — `/yaksa/forum/communities/{id}`, `/{id}/members`

`apps/api-server/src` 및 `packages` 전수 검색 결과 **`/yaksa/forum/communities*` 를 구현하는 핸들러는 0건**이다 (검색에 걸리는 것은 `yaksa.search.routes.ts` 의 `/search` 계열과 `ForumRecommendationController.ts:88` 의 stale 주석뿐).

### 6-3. Admin route — 도달 불가

`apps/admin-dashboard/src/routes/apps.routes.tsx:118–145` 의 3개 route 는 이중 게이트다.

```tsx
<AdminProtectedRoute requiredPermissions={['forum:read']}>
  <AppRouteGuard appId="forum-yaksa"> … </AppRouteGuard>
</AdminProtectedRoute>
```

- `AppRouteGuard` (`components/AppRouteGuard.tsx`) 는 `isActive(appId)` 가 false 이면 `/error/app-disabled` 로 redirect 한다.
- `isActive` 의 출처는 `useAppStatus` → `GET /api/v1/apps/availability` → `AppManager.listInstalled()` → **`app_registry` 테이블**이다 (`routes/app-availability.routes.ts:64–70`).
- 프로덕션 `app_registry` 에 `forum-yaksa` 행이 **없다** (§16). → 세 route 는 항상 redirect 된다.
- 또한 `apps/admin-dashboard/src` 전수 검색 결과 `/yaksa/communities` 를 가리키는 **메뉴 항목이 0건**이다 (`apps.routes.tsx` 자신 외 참조 없음). 즉 메뉴로도, 직접 URL 로도 화면에 도달할 수 없다.
- 컴포넌트 자체도 `@ts-expect-error Package not yet implemented` 와 `.catch(() => "Coming Soon")` fallback 으로 작성되어 있다.

### 6-4. 실제로 살아 있는 소비처 — 카탈로그·테스트 계약뿐

| 소비 성격 | 위치 | 실행되는가 |
|---|---|---|
| appsCatalog 항목 | `appsCatalog.ts:364` | 예 — `filterByServiceGroup` 등 카탈로그 API 의 데이터 |
| 서비스 그룹 호환성 규칙 | `service-groups/index.ts` | 예 — cosmetics `incompatibleApps`, yaksa `requiredCoreApps` |
| 멀티테넌트 vitest | `appstore.spec.ts` 15 assertion | **예 — CI 에서 실행되고 현재 green** |
| workspace dependency / project ref / deploy build | `package.json`, `tsconfig.json`, `deploy-api.yml` | 빌드 시 |
| main-site appstore 카탈로그 | `registry.ts`, `manifestLoader.ts` | 앱스토어 목록 표시 |

## 7. `forum-yaksa` 판정 및 근거

**판정: `REMOVE_LEGACY`** (단, 아래 §17 의 lockstep 범위를 함께 처리해야 함)

근거 (전부 실측):

1. 백엔드 라우트가 **구조적으로 존재하지 않는다** — `backend/index.ts` 가 "no routes" 로 명시하고 manifest 의 `routesExport: 'createRoutes'` 는 실재하지 않는 심볼을 가리킨다.
2. admin UI 가 호출하는 `/yaksa/forum/communities/*` API 구현이 저장소에 **0건**이다.
3. 프로덕션 `app_registry` 에 `forum-yaksa` 가 **없어** `AppRouteGuard` 가 항상 차단한다.
4. admin 메뉴에 진입점이 **0건**이다.
5. 프로덕션에 `yaksa_forum_community*` 테이블이 **존재하지 않는다** (§16) — `lifecycle/install.ts` 가 한 번도 실행된 적 없다.
6. 현재 운영 중인 KPA Society 포럼은 `/api/v1/kpa/forum` + `/api/v1/forum` 으로 **완전히 독립** 동작한다 (§5).

WO 경계 준수: "`yaksa` 라는 이름만으로 legacy 로 판정하지 않는다" — 위 판정은 이름이 아니라 **라우트 부재 · API 부재 · registry 부재 · 테이블 부재 · KPA 흐름 무관** 이라는 5개 실측 근거에 따른 것이다. 현재 운영 중인 KPA Society 포럼 기능은 이 판정의 영향을 받지 않는다.

## 8. Vite alias 전체 목록과 대상 경로

11개 vite config (`apps/{admin-dashboard,forum-web,main-site,page-generator}`, `services/{signage-player-web,web-account,web-glycopharm,web-k-cosmetics,web-kpa-society,web-neture,web-pharmacy-hub}`, `vite.config.shared.ts`) 전수에서 `packages/` 를 가리키는 alias 의 대상 경로 존재 여부를 검사했다.

- **삭제된 경로를 가리키는 alias: 0건** — 약사회 legacy 제거로 사라진 `membership-yaksa` / `lms-yaksa` / `reporting-yaksa` / `annualfee-yaksa` / `yaksa-scheduler` / `yaksa-accounting` / `yaksa-admin` / `member-yaksa` 를 가리키는 alias 는 어디에도 남아 있지 않다.
- **`yaksa` 를 포함하는 alias: 1건** — `apps/admin-dashboard/vite.config.ts:43`

| alias | 정의 위치 | 대상 경로 | 존재 |
|---|---|---|:---:|
| `@o4o/forum-core-yaksa` | `apps/admin-dashboard/vite.config.ts:43` | `packages/forum-yaksa` | **OK** |

동일 alias 는 `vite.config.ts:103` `optimizeDeps.exclude` 에도 등록되어 있다 (사전 번들링 제외 — source import 용).

## 9. 각 Vite alias 의 실제 소비처

| alias | 소비처 | 형태 |
|---|---|---|
| `@o4o/forum-core-yaksa` | `apps/admin-dashboard/src/routes/apps.routes.tsx:16,22,28` | **동적 import 3건** — `import('@o4o/forum-core-yaksa/src/admin-ui/pages/…')` |
| (동일) | `apps/main-site/src/appstore/registry.ts:69,70` | 문자열 값(`manifestPath` / `packageName`) — module resolution 대상 **아님**. 실제 로드는 `manifestLoader.ts` 가 `../../../packages/{folderName}/manifest.json` 상대 경로로 수행하며, 실패 시 stub manifest 로 대체된다 |

- **tsconfig 대응: 없음.** `tsconfig*.json` 중 `@o4o/forum-core-yaksa` path mapping 을 가진 파일은 0건이다. 그래서 소비처에 `@ts-expect-error Package not yet implemented` 가 붙어 있다 — alias 는 **Vite 전용**이고 타입 계층에는 존재하지 않는다.
- **build 필요 여부: 필요함(현 상태에서는).** 대상 파일이 실재하므로 Vite 빌드는 이 동적 import 를 정상 resolve 해 별도 chunk 로 만든다. 소비 코드를 남긴 채 alias 만 제거하면 bare specifier 가 resolve 되지 않아 빌드가 깨진다.
- **test 소비: 없음.** 어떤 테스트도 이 alias 를 import 하지 않는다.

## 10. Vite alias 별 판정

| alias | 판정 | 근거 |
|---|---|---|
| `@o4o/forum-core-yaksa` (`vite.config.ts:43` + `optimizeDeps.exclude:103`) | **`REMOVE_LEGACY` (lockstep)** | 유일한 module-resolution 소비처가 §7 에서 `REMOVE_LEGACY` 로 확정된 dead admin route 3건뿐이다. **단독 제거 금지** — `apps.routes.tsx` 의 import·route 제거와 **같은 커밋**에서 처리해야 빌드가 깨지지 않는다. |
| 그 외 전체 vite alias | **`KEEP_CURRENT`** | 대상 경로가 모두 실재하고 약사회 legacy 와 무관하다. 삭제된 패키지를 가리키는 alias 는 0건. |

## 11. `tests/multi-tenant/setup.ts` fixture 구성

- 성격: **DB 를 쓰지 않는 순수 in-memory 시뮬레이션 fixture**. `NavigationRegistry` / `ViewRegistry` (`packages/cms-core/src/view-system/*`) 와 `appsCatalog` 를 import 해, 서비스 그룹별 tenant·nav·view 를 등록한다.
- 약사회 관련 fixture:
  - nav 3건 (`setup.ts:142,151,160`) — appId `membership-yaksa` ×2, `lms-yaksa` ×1
  - view 5건 (`setup.ts:313–346`) — `membership-yaksa` ×2, **`forum-yaksa` ×1** (`yaksa.post.list`), `lms-yaksa` ×2
  - context 필드 `yaksaTenants` (`setup.ts:20,416,430,475`)
- 이 값들은 전부 **문자열 리터럴**이다. 삭제된 패키지를 import 하지 않으므로 패키지 제거로 깨지지 않는다.

## 12. fixture 를 소비하는 test suite 와 실행 여부

| 소비처 | 비고 |
|---|---|
| `appstore.spec.ts:19` | `forum-yaksa` assertion 15건 보유 |
| `data-isolation.spec.ts:16` | |
| `navigation.spec.ts:17` | |
| `view-system.spec.ts:18` | |
| `index.ts:27` | re-export |

**실행 여부: 실행된다.**

- jest 는 실행하지 않는다 — `apps/api-server/jest.config.cjs` 의 `roots: ['<rootDir>/src']` 가 `tests/` 를 제외한다.
- vitest 가 실행한다 — `.github/workflows/ci-pipeline.yml:93`
  `cd apps/api-server/tests/multi-tenant && npx vitest run --passWithNoTests`

## 13. fixture 판정 및 공용 테스트 영향

**판정: `KEEP_CURRENT`**

- 4개 spec, **75 테스트**가 이 fixture 위에서 동작하며 CI 파이프라인에서 실제로 실행된다.
- 검증 대상은 약사회 도메인 기능이 아니라 **멀티테넌트 격리 계약**(서비스 그룹별 nav/view 필터링, 데이터 격리, 앱스토어 호환성)이다. `yaksa` 는 그 계약을 검증하기 위한 **테스트 데이터**다.
- 삭제하면 공용 멀티테넌트 검증 커버리지가 소실된다.

부수 관찰(결함 아님): fixture 의 `membership-yaksa` / `lms-yaksa` appId 는 이제 실재하지 않는 앱을 가리키는 순수 가상 데이터다. registry 등록은 문자열 기반이라 테스트는 정상 통과하며, 운영 코드와의 결합은 없다. 정리 여부는 별도 판단 사항이며 이번 감사에서는 변경하지 않는다.

## 14. 최종 판정 표

| # | 대상 | 판정 | 요지 |
|:--:|---|:---:|---|
| 1 | `forum-yaksa` (패키지 + 카탈로그·번들·빌드·admin route 참조) | **`REMOVE_LEGACY`** | 백엔드 라우트 부재 · 호출 API 구현 0건 · `app_registry` 미등록으로 화면 도달 불가 · 메뉴 진입점 0건 · 프로덕션 테이블 부재 · KPA 포럼과 무관 |
| 2 | Vite alias `@o4o/forum-core-yaksa` (`vite.config.ts:43,103`) | **`REMOVE_LEGACY` (lockstep)** | 유일 소비처가 #1 의 dead admin route. 단독 제거 시 빌드 파손 → 같은 커밋에서 처리 |
| 2b | 그 외 모든 Vite alias | **`KEEP_CURRENT`** | 삭제된 경로를 가리키는 alias 0건 |
| 3 | `tests/multi-tenant/setup.ts` fixture | **`KEEP_CURRENT`** | CI 에서 실행되는 4 spec · 75 테스트의 기반, 멀티테넌트 격리 계약 검증용 |

**추가 HOLD 없음.**

## 15. 관련 typecheck · build · test 결과

실행: 멀티테넌트 vitest suite (읽기 전용, 코드·설정 무수정)

```
cd apps/api-server/tests/multi-tenant && npx vitest run --passWithNoTests

 ✓ data-isolation.spec.ts (18 tests)
 ✓ navigation.spec.ts     (14 tests)
 ✓ view-system.spec.ts    (19 tests)
 ✓ appstore.spec.ts       (24 tests)

 Test Files  4 passed (4)
      Tests  75 passed (75)
   Duration  2.77s
```

`forum-yaksa` 관련 15 assertion 을 포함해 전부 통과 — 현재 계약이 green 임을 확인했다.

admin-dashboard build/typecheck 는 실행하지 않았다. alias 의 build 소비 여부는 정적으로 확정되었고(대상 파일 실재 + bare specifier 동적 import + tsconfig path 부재), 이번 작업이 아무 파일도 바꾸지 않아 회귀 확인 대상이 없기 때문이다.

## 16. DB read-only 조사 결과

접속: cloud-sql-proxy(이 세션 소유 PID, `127.0.0.1:5452`) → `netureyoutube:asia-northeast3:o4o-platform-db` / `o4o_platform`. **SELECT 만 수행**했다. 개인정보·게시글 본문은 조회하지 않았다.

| 확인 항목 | 결과 |
|---|---|
| `yaksa_forum%` 테이블 | **0건** — `yaksa_forum_community` · `yaksa_forum_community_member` 모두 **존재하지 않음** (`lifecycle/install.ts` 미실행) |
| `app_registry` 총 행 수 | 6 |
| `app_registry` 의 `forum-yaksa` | **없음** |
| `app_registry` 잔존 yaksa 행 3건 | `annualfee-yaksa` · `membership-yaksa` · `reporting-yaksa` — 전부 `status='active'`, `installedAt`/`updatedAt` = **2026-01-22 13:36:28** 이후 변경 없음. 해당 패키지는 선행 WO 에서 제거되어 **가리킬 코드가 없는 stale 행**이다 |
| `app_instances` | **0행** |
| `apps` 테이블의 forum/yaksa slug | **0행** |

조사만 수행했으며 DB 에 대한 INSERT/UPDATE/DELETE/DDL 은 없다. `yaksa_*` 테이블 정리 판단은 WO 범위 밖(선행 CHECK 의 H5)이다.

세션 소유 proxy 프로세스(PID 10928)만 종료했고, 프로세스명 일괄 종료는 사용하지 않았다.

## 17. 후속 제거가 필요한 정확한 최소 범위

> **이번 작업에서는 아래를 하나도 삭제하지 않았다.** 후속 WO 용 범위 제시다.
> 아래 A~D 는 **하나의 커밋에서 함께** 처리해야 빌드·테스트가 깨지지 않는다.

### A. Frontend 소비처 (먼저 끊는다)

1. `apps/admin-dashboard/src/routes/apps.routes.tsx` — 13–31행 동적 import 3건, 118–145행 route 3건 제거
2. `apps/admin-dashboard/vite.config.ts:43` — alias 1줄 제거
3. `apps/admin-dashboard/vite.config.ts:103` — `optimizeDeps.exclude` 항목 1줄 제거
4. `apps/main-site/src/appstore/registry.ts:64–71` — `forum-yaksa` 항목 제거
5. `apps/main-site/src/appstore/manifestLoader.ts:33` folderName 매핑 · `:174–181` stub manifest 제거

### B. Backend 카탈로그·정책

6. `apps/api-server/src/app-manifests/appsCatalog.ts:363–375` — 카탈로그 항목 제거
7. `apps/api-server/src/app-manifests/forum-yaksa.manifest.ts` — 파일 삭제
8. `apps/api-server/src/service-groups/index.ts:297,320,359,421` — `incompatibleApps` / `incompatible` / `requiredCoreApps` 항목 제거
9. `apps/api-server/src/services/app-manager/app-manager.types.ts:21` — union 항목 제거
10. `apps/api-server/src/services/service-monitor.service.ts:514` — 목록 항목 제거
11. `apps/api-server/src/service-templates/templates/yaksa-branch.json:8` · `validators/template-linter.ts:53,74`
12. `apps/api-server/scripts/bootstrap-install-apps.{ts,mjs}` — `'forum-yaksa'` 제거
13. `bundles/yaksa.bundle.json:27–31`(apps 항목) · `:65`(installOrder)

### C. 패키지·빌드 배선

14. `packages/forum-yaksa/**` — 디렉터리 삭제 (35 tracked 파일)
15. `apps/api-server/packages/forum-yaksa/package.json` — 삭제
16. `apps/api-server/package.json:118` — `"@o4o-apps/forum-yaksa": "workspace:*"` 제거 (lockfile 재생성 동반)
17. `tsconfig.json:53` — project reference 제거
18. `.github/workflows/deploy-api.yml:101` — build step 제거
19. `scripts/dev.mjs:148,197` — `appStorePackages` 에서 제거

### D. 테스트 계약 (같은 커밋에서 갱신)

20. `apps/api-server/tests/multi-tenant/appstore.spec.ts` — `forum-yaksa` 를 근거로 삼는 15 assertion 재작성. **주의**: `:83–84`, `:251–252`, `:422–423` 주석이 "잔존 yaksa 전용 항목은 `forum-yaksa` 뿐" 이라고 명시하므로, 제거 시 yaksa 서비스 그룹의 **호환성·의존체인 검증 대체 대상**이 필요하다. yaksa 그룹의 `requiredCoreApps` 도 `['cms-core','organization-core']` 축으로 재정의해야 한다.
21. `apps/api-server/tests/multi-tenant/setup.ts:327–332` — view fixture `yaksa.post.list` 만 정리(파일 자체는 §13 대로 **보존**)

### E. 정리 대상 아님 / 별도 판단

- `tmp/forum_yaksa_install.sql`, 각 `TODO.md`, `scripts/appstore-guard.ts:288` 주석, `bundles/README.md:101` — 문서·주석 전용, 선택 사항
- `app_registry` 의 stale 3행(`annualfee-yaksa`/`membership-yaksa`/`reporting-yaksa`) 및 `yaksa_*` 테이블 — **DB 변경이므로 별도 WO + 사용자 승인** (선행 CHECK H5)

### 후속 WO 검증 명령

```
pnpm --filter @o4o/api-server exec tsc --noEmit
cd apps/api-server/tests/multi-tenant && npx vitest run
pnpm --filter @o4o/admin-dashboard run build
pnpm --filter @o4o/main-site run build
```

## 18. 코드·설정·DB·schema·migration·seed·배포 변경 0

| 항목 | 결과 |
|---|---|
| `forum-yaksa` 코드 수정·삭제 | 없음 |
| Vite / tsconfig 설정 변경 | 없음 |
| 테스트 fixture 수정·삭제 | 없음 |
| package dependency / lockfile 변경 | 없음 |
| 운영 DB INSERT·UPDATE·DELETE·DDL | 없음 (SELECT 전용) |
| schema · migration · seed | 없음 |
| 배포 | 없음 |

이번 커밋의 변경 파일은 본 CHECK 문서 1개뿐이다.

## 19. 타 세션 WIP 보존

§2 의 HFF ZH 파일 9건(수정 1 + untracked 8)은 조회조차 하지 않았고 수정·삭제·stash·reset·checkout·commit 대상에 포함하지 않았다. 커밋은 본 CHECK 파일 경로만 지정해 수행했다.

## 20. CHECK 경로 · commit · push · 최종 ahead/behind

| 항목 | 값 |
|---|---|
| CHECK 경로 | `docs/checks/WO-O4O-FORUM-YAKSA-AND-LEGACY-BUILD-TEST-RESIDUE-BOUNDARY-AUDIT-V1-CHECK.md` |
| commit | (아래 §20 결과 참조) |
| push | (아래 §20 결과 참조) |
| 최종 ahead/behind | (아래 §20 결과 참조) |

---

**완료 문장**

`forum-yaksa`, 잔여 Vite alias 및 멀티테넌트 테스트 fixture 의 현재 운영·빌드·테스트 소비 경계를 조사하여 각각의 유지 또는 제거 방향을 확정했다. 이번 작업에서는 코드·설정·운영 DB·schema·migration·seed 및 배포를 변경하지 않았다.
