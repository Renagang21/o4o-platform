# CHECK-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1

> **상태**: **CLOSED** — 1차(admin Content Assets 축, `ae06d0a31`) + 2차(dashboard-assets 축 A안 승인, `c52aeb083`) 모두 CI·배포·운영 실측 완료. cms_media 계열 완전 종결
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

## 6. §9 중지 조건 발동 — dashboard-assets 축 (1차 시점 보고 · **§12 에서 A안으로 해소**)

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

## 9. 완료 판정 (2차 반영 · 최종)

```text
LEGACY_CMS_MEDIA_RUNTIME            = ZERO      (CmsMedia entity · handlers · lifecycle DDL · 두 서비스 소비자 전부 제거, spec 22 고정)
CMS_MEDIA_ERROR_SWALLOWING          = ZERO      (삼킴 3곳 = 제거된 핸들러와 함께 소멸, 운영 404 실측)
LEGACY_CONTENT_ASSETS_API           = ZERO      (1차 · 운영 404)
DASHBOARD_ASSETS_RUNTIME            = ZERO      (signal 2개 외 라우트 0 · 운영 404 ×4)
DASHBOARD_ASSETS_ACTIVE_ROUTE       = ZERO
DASHBOARD_ASSETS_FRONTEND_CONSUMER  = ZERO      (배포 번들 실측 0)
CMS_MEDIA_TABLE_CREATED             = ZERO
MEDIA_V2_CANONICAL_RUNTIME          = PASS      (운영 200 · 실데이터)
ADMIN_MEDIA_LIBRARY_ENTRY           = PASS      (1차)
MEDIA_ENTITY_LINKS_PRESERVED        = PASS
SUPPLIER_SELLER_SIGNALS             = PRESERVED (운영 200 ×2 · Neture 소비 보존)
OTHER_CONTENT_FUNCTIONS             = PRESERVED (Neture /content 목록 · /content/:id · cmsApi · homepageCmsApi · KPA /mypage 불변)
OTHER_MEDIA_DOMAINS_PRESERVED       = PASS
OTHER_SERVICE_REGRESSION            = PASS      (kpa/neture/admin type-check·build·lint 0 · api jest 4,404 pass)
PRODUCTION_SCHEMA_CHANGE            = ZERO
PRODUCTION_DATA_CHANGE              = ZERO
PRODUCTION_BROWSER_SMOKE            = NOT_RUN   (§12-4 — API·번들·로그 계층까지 실측)

CMS_LEGACY_MEDIA_TO_MEDIA_V2_CANONICALIZATION = CLOSED
```

WO §10 조건 전부 충족. `cms_media` 계열(entity 4 · 테이블 DDL 4 · 라우트 · 핸들러 · 프런트 소비자)은 저장소에서 종결됐다.

## 10. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (1차의 제안 1건은 §12 로 해소)
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
| 4 | push 시점(1차) — 다른 세션 CI 진행 중에 push 했다(기존 run 은 취소되지 않고 완주) | 절차 |
| 5 | push 시점(2차) — 확인·rebase·push 를 한 명령에 체인해 "진행 중 2건" 출력에도 push 가 실행됐고, **`d26dc7ea4`(다른 세션 · CHECK 문서 1파일)의 CI Pipeline·CodeQL 이 취소됐다.** 문서 전용 커밋이라 코드 검증 손실은 없고 `c52aeb083` 이 그 위에서 같은 트리를 검증해 success 했다. 확인과 push 를 별도 호출로 분리하도록 메모리에 기록 | 절차 · 사고 |
| 6 | `@o4o/shared-space-ui` ContentHubTemplate 의 optional copy props(`loadCopiedIds`/`onCopy`/`copy*Label`/`afterCopyAction`) — 이번 제거로 소비자 0 이 됐다. 공용 패키지라 손대지 않음 | 별도 판단 |
| 7 | signal 핸들러 2개의 `product_approvals` catch("Table may not exist — silent fallback") — 보존 대상 내부. 그 테이블은 운영에 존재하며 `cms_media` 삼킴과 다른 성질 | 보고만 |
| 8 | `docs/platform/store/IR-STORE-CONTENT-UX-PRINCIPLE-ALIGNMENT-AUDIT-V1.md` 가 `POST /dashboard/assets/copy` 를 서술 — IR 기록물(2026-04-20) 이라 §16-1 대상 아님 | 보고만 |
