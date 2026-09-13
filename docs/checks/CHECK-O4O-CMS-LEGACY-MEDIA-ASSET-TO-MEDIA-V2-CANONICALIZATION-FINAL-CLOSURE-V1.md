# CHECK-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1

> **상태**: **PARTIAL** — admin Content Assets 축 CLOSED(CI·배포·운영 실측 완료) / dashboard-assets 축은 WO §9 중지 조건으로 미실행·보고
> **작성일**: 2026-09-13
> **WO**: WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1
> **기준 조사**: [`IR-O4O-CMS-MEDIA-PAGE-VIEW-LEGACY-RUNTIME-AND-MEDIA-V2-OWNERSHIP-CENSUS-V1`](../investigations/IR-O4O-CMS-MEDIA-PAGE-VIEW-LEGACY-RUNTIME-AND-MEDIA-V2-OWNERSHIP-CENSUS-V1.md)
> **기준 SHA**: `00b96bc81` (origin/main · 작업트리 clean · 대상 파일 상류 겹침 0)

---

## 1. 선행 조사의 정정 (중요)

기준 IR 을 다시 검증하면서 **조사 범위 누락 2건**을 찾았다. WO 의 전제에 영향을 주므로 먼저 적는다.

| # | IR 의 서술 | 실제 | 영향 |
|:-:|---|---|---|
| 1 | "`/content/analytics` 는 API 를 호출하지 않는 정적 화면" | **틀렸다.** `contentAssetsApi.getStats()` → `/api/v1/content/assets/stats` 를 호출한다. 즉 **legacy 축의 두 번째 깨진 화면**이다 | 제거 대상에 포함 (§3) |
| 2 | 소비처 census 를 `apps/**` · `packages/**` 로만 수행 | **`services/**` 6개 배포 웹을 누락**했다. `/api/v1/dashboard/assets` 소비자가 거기 있다 | **§9 중지 조건 발동** (§6) |

IR 본문은 기록물이므로 수정하지 않는다(CLAUDE.md §16-1). 정정 사실은 본 CHECK 가 정본이다.

---

## 2. 전수표 (route → controller → service → entity → table → frontend)

| # | route | 구현 | entity/table | frontend 소비 | 처분 |
|:-:|---|---|---|---|---|
| 1 | `GET /api/v1/content/assets` · `/:id` · `/stats` · `/health` · `/:id/copy` | `routes/content/content-assets.routes.ts` | `CmsMedia` → `cms_media` | admin: `api/content-assets.api.ts` → `pages/content/assets/*` · `pages/content/analytics` | **제거** |
| 2 | `GET /api/v1/dashboard/assets` · `/copied-source-ids` · `/kpi` | `dashboard-assets.query-handlers.ts` | `CmsMedia` → `cms_media` | **`services/web-kpa-society` `/my-content`** · **`services/web-neture` `/content`** | **중지·보고** (§6) |
| 3 | `POST /copy` · `PATCH /:id` · `/:id/publish` · `/:id/archive` · `DELETE /:id` | `dashboard-assets.{copy,mutation}-handlers.ts` | `CmsMedia` → `cms_media` | 위 두 화면 | **중지·보고** (§6) |
| 4 | `GET /api/v1/dashboard/assets/supplier-signal` · `/seller-signal` | `dashboard-assets.query-handlers.ts` | **`product_approvals`** (cms_media 무관) | `www.neture.co.kr` 실호출 확인 | **보존** |
| 5 | `/api/v1/platform/media-library*` (목록 · 업로드 · folder · metadata · usage · external · links · relations) | `modules/media/controllers/*` | `MediaAsset` → `media_assets` · `media_entity_links` | admin: `api/media-library.api.ts` → `content-resource/MediaAssetsPage` · `MediaCatalogPanel` · `ContentFormModal` · `VideoJobDetailPage` · `PopCreatePage`, `services/web-k-cosmetics/src/lib/api/media.ts` | **정본 보존** |
| 6 | `/api/v1/content/media*` (레거시 클라이언트) | **backend 없음**(404) | — | `admin/api/contentApi.ts` · `unified-client.ts` · `postApi.ts` | 본 WO 범위 밖 — 선행 IR §4-2 항목 9 (별도 WO) |
| 7 | admin route `/content-resource/media-assets` | `MediaAssetsPage` | `media_assets` | 메뉴 진입점 **없었음** | **메뉴 노출로 정비** |

`cms_media_files` · `cms_media_folders` · `cms_media_tags` 는 entity 정의뿐 런타임 소비 0 (이번에 손대지 않음 — §7).

---

## 3. 구현

### A. legacy content-assets 축 제거

| 파일 | 처분 |
|---|---|
| `apps/api-server/src/routes/content/content-assets.routes.ts` (574줄) | **삭제** |
| `apps/api-server/src/bootstrap/register-routes.ts` | import + `app.use('/api/v1/content/assets')` 등록 블록 제거, 자리에 제거 사유 주석 |
| `apps/admin-dashboard/src/api/content-assets.api.ts` | **삭제** |
| `apps/admin-dashboard/src/pages/content/assets/index.tsx` · `[assetId].tsx` | **삭제** |
| `apps/admin-dashboard/src/pages/content/analytics/index.tsx` | **삭제** (§1-1 — 이 화면도 `/content/assets/stats` 하나에만 의존) |
| `apps/admin-dashboard/src/routes/content.routes.tsx` | lazy import 3 · Route 3 제거 |

**대체 alias 를 만들지 않았다.** `cms_media` 생성 migration도 추가하지 않았다.

### B. Media V2 관리자 연결

| 파일 | 변경 |
|---|---|
| `admin/menu/admin-menu.static.tsx` | `Content › Assets`(`/content/assets`) → **`Content › 미디어 라이브러리`**(`/content-resource/media-assets`) 로 교체 · `Content › Analytics` 제거 |
| `config/rolePermissions.ts` | `content-assets` → `content-media-library` · `content-analytics` 제거 (권한은 `PLATFORM_ADMIN_ROLES` 그대로) |
| `pages/content/index.tsx` (Overview) | 타일 2개를 같은 기준으로 교체·제거 (데드링크 0) |
| `pages/content-resource/MediaAssetsPage.tsx` | 화면 제목 `Media Assets` → **`미디어 라이브러리`** · 헤더 주석에 정본 지위 명시 |

**새 화면·새 API·새 alias 를 만들지 않았다.** 기존 화면의 이름과 진입점만 정비했다.

### C. 콘텐츠 연결

CMS 콘텐츠(`ContentFormModal`)는 이미 `/platform/media-library/upload` 를 쓰고 URL 필드로 저장한다.
`media_entity_links` 로 DB 관계를 새로 만드는 작업은 **하지 않았다** (WO §5-C: 실제 소비가 없는 미래용 연결을 만들지 않는다).
현재 상태를 사실대로 적으면 — **CMS 콘텐츠 ↔ 미디어는 URL 참조이며 `media_entity_links` 연결이 없다.**
`media_entity_links` 를 실제로 쓰는 소비자는 `modules/automation`(VIDEO Job, `entity_type='video-production-job'`) 과 media-catalog 이다.

### D. 오류 은폐

`content-assets` 축에는 삼킴이 없었다(바로 500 을 냈다). 삼킴 3곳은 전부 **dashboard-assets** 에 있고 §6 으로 중지했다.
404 를 200 빈 배열로 바꾸는 fallback 은 **만들지 않았다** — 제거한 route 는 그냥 없어진다.

### E. 회귀 가드

`apps/api-server/src/__tests__/cms-legacy-media-to-media-v2-canonicalization.spec.ts` (**14 tests**)

```text
A. legacy 제거        route 파일 부재 · 등록 0 · admin API/화면 부재 · admin route 선언 0
B. 재도입 방지        cms_media CREATE TABLE migration 0 · content/assets alias 0
C. 정본 보존          media-library 라우터 등록 · media_assets 테이블명 · media_entity_links · 정본 화면 존재
D. 관리자 진입점      메뉴가 정본 경로 노출 + legacy 경로 0 · rolePermissions menuId 정합 · Overview 데드링크 0
```

기존 테스트 기대치 갱신 2건: `admin-information-architecture.test.ts`(메뉴 경로 집합), `admin-authorization-registry-and-dead-surface-final-closure.test.ts`(클릭 메뉴 24→23 · 전 노드 30→29).

---

## 4. 변경 파일 (15)

```text
D  apps/api-server/src/routes/content/content-assets.routes.ts
M  apps/api-server/src/bootstrap/register-routes.ts
A  apps/api-server/src/__tests__/cms-legacy-media-to-media-v2-canonicalization.spec.ts
D  apps/admin-dashboard/src/api/content-assets.api.ts
D  apps/admin-dashboard/src/pages/content/assets/index.tsx
D  apps/admin-dashboard/src/pages/content/assets/[assetId].tsx
D  apps/admin-dashboard/src/pages/content/analytics/index.tsx
M  apps/admin-dashboard/src/routes/content.routes.tsx
M  apps/admin-dashboard/src/routes/dashboard.routes.tsx        (stale 주석 정정)
M  apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx
M  apps/admin-dashboard/src/config/rolePermissions.ts
M  apps/admin-dashboard/src/pages/content/index.tsx
M  apps/admin-dashboard/src/pages/content-resource/MediaAssetsPage.tsx
M  apps/admin-dashboard/src/tests/admin-information-architecture.test.ts
M  apps/admin-dashboard/src/tests/admin-authorization-registry-and-dead-surface-final-closure.test.ts
```

**schema 변경 0 · migration 추가 0 · 운영 DB write 0 · dependency/lockfile 변경 0.**

---

## 5. 검증

| 단계 | 결과 |
|---|---|
| `pnpm --filter @o4o/api-server run type-check` | ✅ 0 errors |
| `pnpm --filter @o4o/admin-dashboard run type-check` | ✅ 0 errors |
| `pnpm --filter @o4o/admin-dashboard run test` | ✅ **16/16 suites** |
| `pnpm --filter @o4o/admin-dashboard run build` | ✅ exit 0 |
| `pnpm --filter @o4o/admin-dashboard run lint:no-fix` | ✅ 0 errors |
| `pnpm --filter @o4o/api-server run lint:no-fix` | ⚠️ 44 errors / 481 warnings = **baseline 동일**(stash 후 실측). 내 파일 **0** (초기 1건은 `require()` → import 로 수정) |
| api-server 전체 Jest (`--runInBand`) | **271/272 suites · 4,421 pass · 21 skipped · 723s**. 실패 1 suite(2 tests) = `main-site-full-source-deletion.spec.ts` — **내 변경과 무관** (§5-1) |
| `node scripts/check-unsafe-routes.mjs` | ✅ 1143 파일 · 위반 0 |
| Production 검증 | ✅ §8 |

### 5-1. 무관한 실패 1건 (로컬 전용)

`main-site-full-source-deletion.spec.ts` 는 `apps/main-site` 디렉터리 부재를 단언한다.
로컬 디스크에 **추적되지 않는 빌드 잔여물**(`apps/main-site/{dist,node_modules}` 2개 항목, git 추적 파일 0)이
남아 있어 실패한다 — 소스는 다른 세션의 `a425865ba` 에서 이미 전량 삭제됐다.
clean 체크아웃인 CI 에서는 발생하지 않는다. **미추적 파일은 병렬 세션 소유 원칙상 삭제하지 않았다**(§11 보고).

---

## 6. §9 중지 조건 발동 — dashboard-assets 축 (미실행, 보고)

### 6-1. 무엇을 멈췄나

`CmsMedia` entity 삭제와 `cms_media` 삼킴 제거를 **하지 않았다.** 남아 있는 cms_media 런타임:

```text
apps/api-server/src/routes/dashboard/dashboard-assets.query-handlers.ts     (CmsMedia 2 · 삼킴 3)
apps/api-server/src/routes/dashboard/dashboard-assets.mutation-handlers.ts  (CmsMedia 5)
apps/api-server/src/routes/dashboard/dashboard-assets.copy-handlers.ts      (CmsMedia 5)
apps/api-server/src/routes/dashboard/dashboard-assets.types.ts              (CmsMedia 1)
packages/cms-core/src/entities/CmsMedia*.entity.ts + database/entities.ts 등록
```

### 6-2. 왜 멈췄나 (WO §9 1번 — "cms_media 를 실제 사용하는 소비자가 확인됨")

**배포되는 웹 2개에 사용자 화면이 있다.**

| 서비스 | 화면 | route | 쓰는 API |
|---|---|---|---|
| `services/web-kpa-society` | `pages/dashboard/MyContentPage.tsx` | `/my-content` | `/dashboard/assets` · `/kpi` · `/copied-source-ids` · `/copy` · `PATCH /:id` |
| `services/web-neture` | `pages/library/ContentLibraryPage.tsx` | `/content` | `/dashboard/assets/copy` · `/copied-source-ids` |

두 서비스 모두 `deploy-web-services.yml` 의 배포 대상이다. WO 의 처분 표에는 `/dashboard/assets` 가 없고,
이 축을 지우면 **두 서비스의 사용자 화면을 함께 삭제**해야 한다 — WO 가 승인한 범위를 넘는다.

### 6-3. 판단에 필요한 사실 (운영 실측)

- **기능은 이미 전부 죽어 있다.** 조회는 삼킴으로 **항상 빈 목록**(200), 쓰기(`copy`·`publish`·`archive`·`delete`·`PATCH`)는 **500**.
  `cms_media` 가 운영에 존재한 적이 없으므로 **처음부터 동작한 적이 없다.**
- **최근 실사용 트래픽 0.** 30일 로그에서 이 축 호출은 2026-08-19 ~ 08-26 의 소수(`neture.co.kr` · `localhost:4183`)뿐이고
  최근 2주 이상 실사용 호출이 없다(2026-09-10 의 401, 2026-09-12 의 내 조사 probe 제외).
- 같은 라우터의 `supplier-signal` · `seller-signal` 은 `product_approvals` 기반이라 **분리 보존 가능**하다.

### 6-4. 선택지

| 안 | 내용 | 영향 |
|---|---|---|
| **A** | dashboard-assets 의 cms_media 축(조회·복사·발행·보관·삭제) + 두 서비스 화면 제거, `supplier-signal`·`seller-signal` 존치 | `LEGACY_CMS_MEDIA_RUNTIME = ZERO` 달성. 두 서비스에서 "내 자료함"이 사라진다(동작한 적 없는 기능) |
| **B** | 자료함 기능을 **Media V2 로 재구현** | 새 기능 개발 — 별도 WO 규모 |
| **C** | 현 상태 유지 | `CmsMedia` entity·삼킴 잔존. 사용자는 계속 빈 화면을 본다 |

권고는 **A** 다 — 다만 사용자 화면 2개 삭제는 사업 판단이므로 승인 없이 진행하지 않았다.

---

## 7. 이번 WO 에서 손대지 않은 것 (보존 경계 준수)

`media_assets` · `media_entity_links` · `/platform/media-library*` · `signage_media` · `store_execution_assets` ·
`store_videos` · `product_images` · `CmsContent` · `cms_contents` · `cms_content_slots` · O4O Editor · `block-renderer`
— 전부 불변. lifecycle 나머지 14개 테이블도 생성·삭제하지 않았다(다음 단계 과제).

---

## 8. CI · 배포 · Production 검증

### 8-1. CI (구현 SHA = push SHA = `ae06d0a31`, 취소·대체 없이 자기 SHA 에서 완주)

| 워크플로 | 결과 | run |
|---|---|---:|
| CI Pipeline | ✅ success | 34730463681 |
| CodeQL Security Analysis | ✅ success | 34730463655 |
| Deploy API Server (Cloud Run) | ✅ success | 34730463716 |
| Deploy Admin Dashboard (Cloud Run) | ✅ success | 34730463705 |

배포 revision: API `o4o-core-api-03638-4zc` (트래픽 100%) · Admin `o4o-admin-dashboard-01263-xtz`.

### 8-2. 운영 실측 (platform:super_admin 로그인 후 GET)

| 경로 | 기대 | 실측 |
|---|---|---|
| `GET /api/v1/content/assets?limit=1` | 제거됨 | **404** (전: 500 `relation "cms_media" does not exist`) |
| `GET /api/v1/content/assets/stats` | 제거됨 | **404** (전: 500) |
| `GET /api/v1/platform/media-library?limit=2` | 정본 | **200** · `media_assets` 실데이터 |
| `GET /api/v1/dashboard/assets/supplier-signal` | 보존 | **200** `{"success":true,"hasApprovedSupplier":false}` |
| `GET /api/v1/dashboard/assets/seller-signal` | 보존 | **200** `{"success":true,"hasApprovedSeller":false}` |

### 8-3. 배포된 관리자 번들 실측

`https://admin.neture.co.kr` 진입 번들 `index-BZ7hDxcJ.js`:
**`content/assets` 출현 0** · **`content-resource/media-assets` 출현 2** → 깨진 진입점이 배포본에서 사라지고 정본 경로가 들어갔다.

### 8-4. 신규 revision 로그

`o4o-core-api-03638-4zc` 기동 이후 `cms_media` 관련 오류 **0건**, severity ≥ ERROR **0건**
(전: 30일간 `cms_media` 46건).

### 8-5. 미실측

브라우저 화면 조작(메뉴 클릭 → 미디어 라이브러리 렌더 · console error 0)은 수행하지 않았다.
API·번들·로그 계층까지만 확인했으므로 `PRODUCTION_BROWSER_SMOKE` 는 판정하지 않는다(§9).

---

## 9. 완료 판정

```text
CMS_MEDIA_TABLE_CREATED             = ZERO      (migration 추가 0 · spec 이 CREATE TABLE cms_media 0 을 고정)
LEGACY_CONTENT_ASSETS_API           = ZERO      (route 삭제 · 운영 404 실측 · alias 0)
MEDIA_V2_CANONICAL_RUNTIME          = PASS      (/platform/media-library 200 · media_assets 실데이터)
ADMIN_MEDIA_LIBRARY_ENTRY           = PASS      (메뉴·권한·Overview 타일 정합 · 배포 번들 실측)
MEDIA_ENTITY_LINKS_PRESERVED        = PASS      (automation VIDEO Job 소비 불변)
OTHER_MEDIA_DOMAINS_PRESERVED       = PASS      (signage_media · store_execution_assets · store_videos · product_images 불변)
OTHER_SERVICE_REGRESSION            = PASS      (admin test 16/16 · build 0 · api jest 271/272, 유일 실패는 무관 §5-1)
PRODUCTION_SCHEMA_CHANGE            = ZERO
PRODUCTION_DATA_CHANGE              = ZERO

LEGACY_CMS_MEDIA_RUNTIME            = NOT_ZERO  ← dashboard-assets 축 (§6, WO §9 중지 조건)
CMS_MEDIA_ERROR_SWALLOWING          = NOT_ZERO  ← 같은 축의 삼킴 3곳 (§6)
PRODUCTION_BROWSER_SMOKE            = NOT_RUN   (§8-5)

CMS_LEGACY_MEDIA_TO_MEDIA_V2_CANONICALIZATION = PARTIAL
  — admin Content Assets 축은 CLOSED. dashboard-assets 축은 사용자 판단 대기(§6-4).
```

WO §10 의 두 항목(`LEGACY_CMS_MEDIA_RUNTIME` · `CMS_MEDIA_ERROR_SWALLOWING`)이 ZERO 가 아니므로
**CLOSED 로 보고하지 않는다.** 남은 조건은 §6-4 의 처분 선택 하나다.

---

## 12. 중지 조건 해소 단계 — dashboard-assets 축 최종 제거 (A안 승인, 2026-09-13)

### 12-1. 삭제 전 경계 확인 (WO 지시 1~5)

| 화면 | 판정 | 근거 |
|---|---|---|
| KPA `/my-content` (`pages/dashboard/MyContentPage.tsx`, 1,001줄) | **전용** | 호출 API 가 `dashboardApi.*`(list · kpi · publish · archive · delete · update · getSupplierSignal) 뿐. 다른 CMS 기능 교집합 0 |
| Neture `/workspace/my-content` (`pages/dashboard/MyContentPage.tsx`, 690줄) | **전용** | `contentAssetApi.*` 뿐 |
| Neture `/content` (`ContentLibraryPage.tsx`) | **혼합** | 목록 = `hubContentApi.list`(정상, 보존) + 카드의 "내 콘텐츠로" 복사 버튼(`dashboardCopyApi`, 제거) |
| Neture `/content`(list) · `/content/:id` (`ContentListPage` · `ContentDetailPage`) | **혼합** | 목록·상세·추천·조회수 = `cmsApi`(보존) + "사용 중" 배지(`getCopiedSourceIds`, 제거) |
| Neture `HubPage` | **혼합** | 신호 4종 중 `contentAssetApi.getSupplierSignal()` 1개만 이 축의 클라이언트에 있었음 → 보존 모듈 `dashboardApi` 로 이동 |
| 메뉴·네비게이션 | 진입점 0 | 두 서비스 모두 `/my-content` 로 가는 메뉴·버튼 없음. 유일한 링크는 `ContentLibraryPage.afterCopyAction`(제거) |
| 저장소 밖 소비자 | 0 | 30일 로그: 실사용 호출은 08-19~08-26 `neture.co.kr`/`localhost` 뿐, 최근 2주 0. 이 호출자 코드가 위 두 서비스다 |

### 12-2. 제거

| 계층 | 파일 | 처분 |
|---|---|---|
| backend route | `routes/dashboard/dashboard-assets.routes.ts` | `/supplier-signal` · `/seller-signal` **2개만** 남김 (경로 불변) |
| backend handlers | `dashboard-assets.query-handlers.ts` | list · copied-source-ids · kpi(= **삼킴 3곳**) 제거, signal 2개만 잔존 |
| | `dashboard-assets.copy-handlers.ts` · `dashboard-assets.mutation-handlers.ts` · `dashboard-assets.types.ts` | **삭제** |
| | `utils/dashboard-access.guard.ts` | **삭제** (소비처 = 위 핸들러뿐) |
| entity | `packages/cms-core/src/entities/CmsMedia{,File,Folder,Tag}.entity.ts` · `entities/index.ts` export | **삭제** |
| | `apps/api-server/src/database/entities.ts` 등록 2곳 | 제거 |
| cms-core lifecycle | `lifecycle/install.ts` — `cms_media*` CREATE TABLE 4 + 인덱스 5 | 제거 (entity 와 한 단위. 나머지 12 테이블은 불변 — 다음 단계) |
| | `lifecycle/uninstall.ts` drop 목록 4 · `manifest.ts` 테이블 목록 4 | 제거 |
| KPA 프런트 | `pages/dashboard/MyContentPage.tsx` · `api/dashboard.ts` · `api/index.ts` export | **삭제** |
| | `App.tsx` `/my-content` | `<Navigate to="/mypage" replace />` (기존 `/dashboard → /mypage` 패턴) |
| Neture 프런트 | `pages/dashboard/MyContentPage.tsx` · `lib/api/dashboardCopy.ts` | **삭제** |
| | `lib/api/content.ts` | `contentAssetApi` · `DashboardAsset/SortType/Kpi` · `CONTENT_ASSETS_LOAD_FAILED`/`_KPI_` 제거. `cmsApi` · `homepageCmsApi` 불변 |
| | `lib/api/dashboard.ts` | `getSupplierSignal` 이동 (보존) |
| | `ContentLibraryPage.tsx` | 복사 버튼 · `loadCopiedIds/onCopy/copy*Label/afterCopyAction` 제거. 목록 불변 |
| | `ContentListPage.tsx` · `ContentDetailPage.tsx` | "사용 중" 배지·`isCopied` 제거. 미사용이 된 `useAuth` 정리 |
| | `HubPage.tsx` | `contentAssetApi.getSupplierSignal` → `dashboardApi.getSupplierSignal` |
| | `App.tsx` `/workspace/my-content` · `/my-content` | `<Navigate to="/" replace />` (기존 은퇴 workspace 경로 패턴) |
| spec | `__tests__/security/dashboard-assets-ownership-gate.spec.ts` | **삭제** — 가드 대상 핸들러 자체가 사라짐 |
| | `cms-legacy-media-to-media-v2-canonicalization.spec.ts` | **A-2 절 8 tests 추가** (총 22) |

**만들지 않은 것**: 대체 화면 · compatibility route · Media V2 치환 · fallback · 빈 목록 위장. 딥링크는 각 서비스의 기존 안전한 상위 경로로만 보낸다.

**`@o4o/shared-space-ui` ContentHubTemplate 의 optional copy props** 는 손대지 않았다 — 공용 패키지이며 web-k-cosmetics · web-kpa-society(HubContentLibraryPage) 도 소비한다(둘 다 copy prop 미사용). 소비 0 인 optional 기능이 남는 셈이라 §11 보고.

**signal 핸들러의 `product_approvals` catch** (`// Table may not exist — silent fallback`) 는 WO 보존 대상(supplier/seller-signal) 내부라 손대지 않았다. `cms_media` 삼킴 3곳과는 다른 테이블이며 그 테이블은 운영에 존재한다.

### 12-3. 검증

| 단계 | 결과 |
|---|---|
| 신규 spec (22 tests) | ✅ 22/22 |
| `@o4o-apps/cms-core` build | ✅ 0 errors |
| api-server type-check | ✅ 0 errors |
| `@o4o/web-kpa-society` type-check · build · lint | ✅ 0 / exit 0 / 0 problems |
| `@o4o/web-neture` type-check · build · lint | ✅ 0 / exit 0 / 0 problems |
| api-server lint | 44 errors = baseline 동일 · 내 파일 0 |
| `check-unsafe-routes` | ✅ 1139 파일 · 위반 0 |
| `check-typeorm-entities` | ✅ DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale 0 |
| api-server 전체 Jest (`--runInBand`) | **270/271 suites · 4,404 pass · 21 skipped**. 실패 1 = `main-site-full-source-deletion.spec.ts` — §5-1 과 같은 로컬 미추적 잔여물, 내 변경과 무관 |
| CI · 배포 · 운영 | _(§12-4)_ |

## 10. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- 기준 문서(`docs/baseline/**` · `docs/architecture/**` · `docs/platform/**`) 중 `/content/assets` 를 현행 기능으로 서술하는 문서는 없었다.
  `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` 의 `cms_media` 언급 1건은 **개념 설명**이며 route 계약이 아니다 — 보고만 한다(§16-2).
- 별도 WO 제안 1건 = §6-4 의 dashboard-assets 축 처분.

## 11. 보고 (범위 밖 · 손대지 않음)

| # | 항목 | 성격 |
|:-:|---|---|
| 1 | `apps/main-site/{dist,node_modules}` 로컬 미추적 잔여물 — 소스는 `a425865ba` 에서 삭제됨 | 병렬 세션 소유 원칙상 삭제하지 않음. CI 영향 없음 |
| 2 | `/api/v1/content/media*` 를 호출하는 admin 클라이언트 3종(`contentApi` · `unified-client` · `postApi`) — backend 404 | 선행 IR §4-2 항목 9. 별도 WO |
| 3 | cms-core lifecycle 나머지 14개 테이블 · `cms_pages`/`cms_fields`/중복 `cms_views` | 다음 단계 과제 (사용자 제시 순서 2·3) |
| 4 | push 시점 — 다른 세션 CI 진행 중에 push 했다(기존 run 은 취소되지 않고 완주). 다음부터 완주 후 push | 절차 |
