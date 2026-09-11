# CHECK-O4O-KCOS-STORE-CONTENTS-WRAPPER-AND-DEAD-ASSET-MOUNT-CLOSURE-V1

> **WO**: `WO-O4O-KCOS-STORE-CONTENTS-WRAPPER-AND-DEAD-ASSET-MOUNT-CLOSURE-V1`
> **상태**: IMPLEMENTED · LOCAL PASS · PRODUCTION E2E 대기 (배포 후 §8 갱신)
> **기준 commit**: `origin/main` = `60bfb79ff` (worktree `work/kcos-store-contents-wrapper-dead-mount-v1`)
> **작성일**: 2026-09-11
> **선행**: `CHECK-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1` (`/assets` 축 · 같은 계열 결함) ·
> `CHECK-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1` (KPA 확장 계층 / 공통·실행 계층 분리 결론)

---

## 0. 결론 (한 줄)

KCos `/store-contents` 를 **KCos 전용 thin wrapper**(조직 결정 + envelope) → **공용 `store-content.service`** 구조로 교정해
KPA 조직 resolver 사용을 제거했고, consumer 0 이 확인된 dead mount 2개(KCos `/published-assets` · Neture `/store-assets`)를
제거했다. KCos `/store-assets` 는 **살아 있는 menu-노출 consumer**(`/store/channels`)가 있어 WO 중지 조건
"consumer 가 남아 있는데 route 제거가 필요함" 에 해당 → **PRESERVED_WITH_REASON** 으로 보고한다. schema · migration · production data 변경 0.

---

## 1. 결함 (재조사 · origin/main 60bfb79ff)

| 항목 | 내용 |
|---|---|
| 마운트 | `cosmetics.routes.ts` → `router.use('/store-contents', createStoreContentController(...))` (공통 KPA 컨트롤러) |
| 조직 해석 | `store-content.controller.ts#resolveDualOrgId` = `isStoreOwner(ds, userId, 'kpa')` + `KpaMember(kpa_members)` fallback — **KPA 하드와이어** |
| 결과 | KCos 전용 매장 = 403 NO_ORG / KPA·KCos 양쪽 회원 = **KPA 조직**의 `kpa_store_contents` 가 KCos 화면에 노출 |
| PH 비교 | `controllers/pharmacy-hub/PharmacyHubStoreContentController.ts` = `resolvePharmacyHubStoreOrganization` → 공용 service (정상 패턴) |

---

## 2. Consumer census (코드 + production 60일 Cloud Run 요청 로그)

로그 조건: `resource.labels.service_name="o4o-core-api" AND httpRequest.requestUrl:"<token>"`, freshness 60d, 조회일 2026-09-10.

### 2-1. KCos `/api/v1/cosmetics/store-contents`

| 축 | 결과 |
|---|---|
| Frontend consumer | `services/web-k-cosmetics/src/api/storeProductionSources.ts#getStoreDirectContents` → `GET /cosmetics/store-contents` (list, `sourceType==='direct'` 필터) — 소비 화면 `StoreProductionMaterialsPage` |
| 다른 경로 consumer (`/by-product` · `/b2c-descriptions` · `/import-b2c-description` · `/:id/reimport-source` · `/direct/:id/translate*` · `/:snapshotId`) | **0** |
| Production 60일 | `GET /` 8건 (2026-08-19) + 세션 E2E 1건(2026-09-10). 그 외 method/경로 **0** |
| 판정 | wrapper 로 교체 — list + direct CRUD 노출, KPA 전용 흐름은 비노출 |

### 2-2. KCos `/api/v1/cosmetics/store-assets` (`kpa_store_asset_controls` 축)

| 축 | 결과 |
|---|---|
| Frontend consumer | `services/web-k-cosmetics/src/api/assetSnapshot.ts#storeAssetControlApi` (list / updatePublishStatus / updateChannelMap) → `pages/store/StoreChannelsPage.tsx` |
| 메뉴 노출 | `App.tsx:840` `<Route path="channels">` · `packages/store-ui-core/src/config/storeMenuConfig.ts` `COSMETICS_STORE_CONFIG` '채널' 그룹 `{ key:'channels', label:'채널 관리', subPath:'/channels' }` · `storeInsightEngine.ts:70` target `/store/channels` |
| Production 60일 | `GET /` 14건 (2026-08-13 · 08-19), `PATCH` 0 |
| 판정 | **PRESERVED_WITH_REASON** — §3 |

### 2-3. KCos `/api/v1/cosmetics/published-assets`

| 축 | 결과 |
|---|---|
| Frontend consumer | 0 (`web-k-cosmetics` 에 `published-assets` 문자열 없음. `publishedAssetsApi` 는 `web-kpa-society` 만 보유 → KPA `/kpa/published-assets` 소비) |
| Production 60일 | **0** |
| 판정 | **REMOVED** (KPA 마운트는 `PrintContentPage` · `PublicContentViewPage` 가 살아 있어 유지) |

### 2-4. Neture `/api/v1/neture/store-assets`

| 축 | 결과 |
|---|---|
| Frontend consumer | 0 (`services/web-neture` 에 `store-assets` 문자열 없음) |
| Production 60일 | **0** |
| raw-source / 문서 소비처 (`check-literal-consumers.mjs --source neture.routes.ts`) | RAW_SOURCE_CONTRACT 1 (`community-crossservice-my-posts-contract.spec.ts` — `/store-assets` 무관, PASS 유지) · HISTORICAL_DOC 2 |
| 판정 | **REMOVED** |

### 2-5. `check-literal-consumers.mjs --source cosmetics.routes.ts`

RAW_SOURCE_CONTRACT 5 (`community-crossservice-my-posts-contract` · `cosmetics-asset-snapshot-scope` · `cross-service-my-store-tablet-scoped-mount` · `store-local-products-service-scoped-org` · `store-slug-canonical-contract`) — 5개 모두 §6 회귀 실행에 포함, PASS.

---

## 3. `/store-assets` 중지 조건 판정 (PRESERVED_WITH_REASON)

WO 승인 범위 2항: "KPA 전용 `kpa_store_asset_controls` 축을 잘못 마운트한 것이 확인되면 제거 / KCos 대체 구현을 새로 만들지는 않음".
WO 중지 조건: "consumer 가 남아 있는데 route 제거가 필요함".

- 잘못 마운트된 것은 **확인됨** (KPA resolver + `KpaStoreAssetControl` 하드와이어. 순수 KCos 매장 = NO_ORG, dual 회원 = KPA 조직 데이터).
- 그러나 consumer 가 **살아 있다**: `/store/channels` 는 KCos 매장 메뉴에 노출된 화면이며 60일간 14건의 실제 요청이 있다.
- 제거하면 메뉴-노출 화면이 dead link 가 된다 (CLAUDE.md §1 "route 없는 메뉴는 노출하지 않는다" 위반). 메뉴 항목 제거는 `store-ui-core` 공통 config 변경 = 이 WO 범위 밖.
- KCos 대체 구현은 WO 가 명시적으로 금지.

→ **마운트 유지 · 코드 변경 0 · 보고.** 잔여 결함: 이 경로는 여전히 dual 회원에 KPA 조직을 해석한다. 후속 판단 후보:
(a) KCos `/store/channels` 메뉴·화면·마운트를 함께 은퇴하는 별도 WO (공통 menu config 소비처 census 필요),
(b) KCos 채널 관리를 공통·실행 계층(`store_execution_assets`)으로 재설계 — B+D 재정렬 WO 에서 결정.

---

## 4. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/o4o-store/controllers/cosmetics-store-content.controller.ts` | **신규** — `createCosmeticsStoreContentController(dataSource, requireAuth)`. `isStoreOwner(ds, userId, 'cosmetics')` 로만 조직 결정 → 공용 `listStoreContents / createDirectContent / getDirectContent / updateDirectContent / deleteDirectContent`. 노출 = `GET /` · `POST /` · `GET/PUT/DELETE /direct/:id`. 에러 코드 = 401 UNAUTHORIZED / 403 STORE_OWNER_REQUIRED (write) / 403 NO_ORG / 400 INVALID_ID / 500 INTERNAL_ERROR. KPA fallback 없음 |
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` | `/store-contents` → KCos wrapper 마운트 · `createStoreContentController` import 제거 · `/published-assets` 마운트 + import 제거 (`/store-assets` · `/assets` 미변경) |
| `apps/api-server/src/routes/neture/neture.routes.ts` | `/store-assets` 마운트 + `createStoreAssetControlController` import 제거 (`/assets` · `/store-playlists` 미변경) |
| `apps/api-server/src/__tests__/cosmetics-store-content-tenant-scope.spec.ts` | **신규** — §1 route / §2 org (실제 핸들러 실행) / §3 dead mount / §4 KPA·PH 불변 / §5 core service serviceKey 분기 0 |

**미변경 (의도)**: `store-content.controller.ts` (KPA) · `store-asset-control.controller.ts` · `published-assets.controller.ts` · `services/store/store-content.service.ts` · `kpa.routes.ts` · PH 컨트롤러 · `KpaStoreAssetControl` entity · 모든 frontend · schema/migration.

---

## 5. Tenant 계약

```text
같은 userId 로
  KPA  요청 /api/v1/kpa/store-contents        → isStoreOwner('kpa') + kpa_members fallback → KPA org  (변경 없음)
  PH   요청 /api/v1/pharmacy-hub/store-owner/content → resolvePharmacyHubStoreOrganization → PH org (변경 없음)
  KCos 요청 /api/v1/cosmetics/store-contents  → isStoreOwner('cosmetics') → KCos org         (교정)
                                                KCos org 없음 → 403 NO_ORG (KPA org 로 대체 안 함)
원장 = kpa_store_contents (legacy physical name · service-neutral Store Production Material) · 격리 축 = organization_id
공용 service = serviceKey 를 모른다 (§5 spec 고정)
```

---

## 6. 로컬 검증

| 검증 | 결과 |
|---|---|
| `jest cosmetics-store-content-tenant-scope.spec.ts` + `cosmetics-asset-snapshot-scope.spec.ts` | 28/28 PASS |
| 관련 8 suite (community-crossservice-my-posts-contract · cosmetics-asset-snapshot-scope · cosmetics-store-content-tenant-scope · cross-service-my-store-tablet-scoped-mount · kcos-pop-v2-canonical-adoption · security/ownership · store-local-products-service-scoped-org · store-slug-canonical-contract) | 91/91 PASS |
| `tsc --noEmit` (apps/api-server) | 0 errors |
| eslint (변경 4 파일) | clean |
| 잔여 참조 grep (`neture/store-assets` · `cosmetics/published-assets`, services/packages/api-server/docs baseline·architecture) | 0 |
| `check-literal-consumers.mjs` (cosmetics.routes.ts · neture.routes.ts) | RAW_SOURCE_CONTRACT 전부 회귀 suite 에 포함 · PASS |

---

## 7. Schema / Migration / Data

- schema 변경 0 · migration 0 · production data migration 0 · production DB write 0.

---

## 8. Production E2E

_(배포 후 갱신)_

---

## 9. 완료 조건

```text
KCOS STORE-CONTENTS TENANT SCOPE = PASS (로컬) · production E2E 대기
KCOS KPA-ASSET MOUNT             = PRESERVED_WITH_REASON (중지 조건 — §3)
PUBLISHED-ASSET DEAD MOUNT       = REMOVED (KCos) · KPA 유지
NETURE DEAD STORE-ASSET MOUNT    = REMOVED
KPA_STORE_ASSET_CONTROLS         = PRESERVED
KPA / PH REGRESSION              = PASS (로컬) · production E2E 대기
SCHEMA CHANGE                    = 0
PRODUCTION E2E                   = 대기
```

---

## 10. 범위 밖 관찰 (보고만)

1. Neture `/api/v1/neture/assets` 는 `createAssetSnapshotController` (KPA 하드코딩 snapshot 컨트롤러) 를 마운트한다 — 이번 WO 범위 밖. consumer census 후 별도 판단.
2. KCos `/store-assets` 잔여 결함 — §3.
