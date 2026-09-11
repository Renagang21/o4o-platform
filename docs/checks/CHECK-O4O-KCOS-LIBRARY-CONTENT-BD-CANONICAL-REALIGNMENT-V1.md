# CHECK-O4O-KCOS-LIBRARY-CONTENT-BD-CANONICAL-REALIGNMENT-V1

> **WO**: `WO-O4O-KCOS-LIBRARY-CONTENT-BD-CANONICAL-REALIGNMENT-V1`
> **상태**: CLOSED_WITH_REPORT · PRODUCTION E2E PASS
> **구현 commit**: `9004d5df8` · 배포 run `34550653891` (Deploy Web Services) success · revision `k-cosmetics-web-01112-5zq`
> **기준 commit**: `origin/main` = `9d2a81292` (worktree `work/kcos-library-bd-realignment-v1`, push 직전 `9c5786345` 위로 rebase)
> **작성일**: 2026-09-11
> **선행**: `CHECK-O4O-KCOS-STORE-CONTENTS-WRAPPER-AND-DEAD-ASSET-MOUNT-CLOSURE-V1` (B 축 `/cosmetics/store-contents` KCos wrapper) ·
> `CHECK-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1` (자료함 → POP V2 handoff · resolver origin 어휘) ·
> `CHECK-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1` (`/assets` KCos org scope)

---

## 0. 결론 (한 줄)

KCos 자료함 '콘텐츠' 탭의 source 를 **KPA 확장 계층 어휘(`/cosmetics/assets?type=content` = `o4o_asset_snapshots`)** 에서 떼어내
**KCos 매장 원장 B+D** — B = `kpa_store_contents`(`GET /cosmetics/store-contents`, origin `direct`) + D = `store_execution_assets`
(`GET /cosmetics/store/assets`, origin `library`) — 로 재정렬했다. 공통 View 는 adapter 가 준 origin 을 그대로 POP V2 handoff 에 싣는다
(생략 시 기존 `snapshot` 유지). backend · schema · `/store-assets` · `/store/channels` · cms/signage copy 흐름은 무변경.

---

## 1. 탭별 source census (step 3 · 4)

`services/web-k-cosmetics/src/App.tsx` 자료함 route 와 실제 source:

| 탭 (route) | 페이지 | source (before) | 계층 | 판정 |
|---|---|---|---|---|
| 콘텐츠 `/store/library/contents` | `StoreLibraryContentsPage` | `assetSnapshotApi.list({type:'content'})` → `GET /cosmetics/assets?type=content` = **AssetSnapshot** | KPA 확장 계층 | **재정렬 대상** |
| 자료 `/store/library/resources` | `StoreLibraryResourcesPage` | `GET /cosmetics/store/library` | 공통 | 무변경 |
| 제작 자료 `/store/library/production-materials` | `StoreProductionMaterialsPage` | `mergeProductionMaterials(executionAssets + blog + qr + directContents)` — D + B(direct 필터) 이미 사용 | 공통·실행 | 무변경 |
| 상품 설명서 `/store/library/product-descriptions` | `StoreProductDescriptionsPage` | SPD | 공통 | 무변경 |
| 채널 통제 `/store/assets` · `/store/channels` | `StoreAssetsPage` (`storeAssetControlApi` → `/cosmetics/store-assets`) | `kpa_store_asset_controls` | KPA 확장 계층 | **범위 밖 · 보존** (선행 CHECK PRESERVED_WITH_REASON) |
| HUB 콘텐츠 `/store-hub/content` · 사이니지 | `HubContentPage` / `HubSignagePage` / `StoreSignagePage` | `assetSnapshotApi.copy({assetType:'cms' 또는 'signage'})` · `list({type:'cms'})` | snapshot (cms/signage) | **범위 밖 · 무변경** |

### 1-1. `type=content` 의존 확인

- KCos 프론트에서 `assetType:'content'` snapshot 을 **만드는 흐름이 없다** (`type: 'content'` 검색 → 자료함 목록 조회 1건뿐). HUB 복사는 `cms`/`signage` 만 쓴다.
  → 콘텐츠 탭은 KCos 에서 **구조적으로 항상 빈 목록**이었다 (production `GET /cosmetics/assets?type=content` n=0, §6).
- 공통 `StoreLibraryContentsView.openProduction` 이 `origin: 'snapshot'` 을 **하드코딩** → 항목이 있었더라도 POP V2 handoff 가
  `GET /cosmetics/pharmacy/pop-v2/sources/content/snapshot/{id}` 로 나가 KCos 원장과 어긋난다 (선행 CHECK POP-HUB-LIBRARY §14 의 404 계열).
- `StoreLibraryContentsView` 소비처 = **KCos 1곳** (`check-literal-consumers.mjs` raw-source 소비처 0 · KPA/PH 는 자체 자료함 페이지).

---

## 2. B 축 확정 (step 5)

| 항목 | 값 |
|---|---|
| 원장 | `kpa_store_contents` (legacy physical name · 논리 = service-neutral Store Production Material · CLAUDE.md §5) |
| 격리 축 | `organization_id` = KCos 매장 조직 (`isStoreOwner(…, 'cosmetics')`, KPA fallback 없음 — 선행 WO wrapper) |
| endpoint | `GET /api/v1/cosmetics/store-contents` → `{ success, data: StoreContentListItem[] }` (`id · sourceType · snapshotId · title · updatedAt`) |
| 포함 행 | `direct` + `snapshot_edit` 전부 (POP V2 `listStoreContentSources` 와 동일 — source_type 필터 없음) |
| POP V2 origin | `direct` — resolver `KpaStoreContent.findOne({ id, organization_id })` |
| 클라이언트 | `api/storeProductionSources.ts#getStoreContents()` 신설. 기존 `getStoreDirectContents()` 는 그 위의 `sourceType==='direct'` 필터로 유지(production-materials 무변경) |

## 3. D 축 확정 (step 6)

| 항목 | 값 |
|---|---|
| 원장 | `store_execution_assets` |
| 격리 축 | `organizationId` = KCos 매장 조직 (`createStoreExecutionAssetsController(ds, auth, 'cosmetics')`) |
| endpoint | `GET /api/v1/cosmetics/store/assets?limit=100` → `{ success, data: { items, total, page, limit } }` |
| 포함 행 | `isActive !== false` (POP V2 `listStoreContentSources` 의 `isActive: true` 와 동일) · assetType 무관 |
| POP V2 origin | `library` — resolver `StoreExecutionAsset.findOne({ id, organizationId })` |
| 클라이언트 | 기존 `api/storeExecutionAssets.ts#getStoreExecutionAssets()` 재사용 |

## 4. source contract 재정렬 (step 7 · 8)

### 4-1. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-k-cosmetics/src/pages/store/StoreLibraryContentsPage.tsx` | `assetSnapshotApi` import 제거. `fetchContents = Promise.all([B, D])` → `StoreLibraryContentItem[]` (origin 명시 · updatedAt DESC 정렬). 문구를 'HUB에서 가져온 콘텐츠' → '내 매장이 보유한 콘텐츠와 제작 자료' 로 |
| `services/web-k-cosmetics/src/api/storeProductionSources.ts` | `StoreContentListItem` · `getStoreContents()` 추가 |
| `packages/store-ui-core/src/components/library/types.ts` | `StoreLibraryContentOrigin` · `StoreLibraryContentItem.origin? / description? / updatedAt?` **additive optional** |
| `packages/store-ui-core/src/components/library/StoreLibraryContentsView.tsx` | `origin: item.origin ?? 'snapshot'` (생략 시 기존 동작) |
| `packages/store-ui-core/src/components/library/libraryHelpers.ts` | `readContentDescription`: `item.description` 우선, 없으면 `contentJson.description` |
| `packages/store-ui-core/src/components/library/StoreLibraryContentRow.tsx` | 날짜 `item.updatedAt ?? item.createdAt` |
| `packages/store-ui-core/src/components/library/index.ts` | `StoreLibraryContentOrigin` type export |
| `apps/api-server/src/__tests__/kcos-library-content-bd-canonical.spec.ts` | 신규 raw-source spec (13 tests) |

### 4-2. 공통 계약 변경 판정

- `StoreLibraryContentItem` 은 **optional 필드 추가만** — 기존 adapter(snapshot 계열)는 그대로 컴파일·동작. serviceKey 분기 0.
- F3 Store Layer(의존 방향) 위반 없음 — store-ui-core 는 서비스 API 를 모른 채 adapter 결과만 받는다.
- 소비처 census: View 소비 = KCos 1곳, KPA/PH `tsc --noEmit` 통과(§5).
- StartProductionModal 기존 규칙 그대로: 선택 항목이 전부 `direct` 면 QR 대상 비활성(KPA direct 콘텐츠와 동일 동작). `library` 행은 제약 없음.

### 4-3. 남은 snapshot 소비 (의도적 보존 · 범위 밖)

| 파일 | 용도 | 판정 |
|---|---|---|
| `pages/hub/HubContentPage.tsx` | `assetSnapshotApi.list({type:'cms'})` 복사 여부 표시 · `copy({assetType:'cms'})` | HUB → 매장 복사 흐름(cms snapshot). 범위 밖 |
| `pages/hub/HubSignagePage.tsx` · `pages/store/StoreSignagePage.tsx` | `copy({assetType:'signage'})` | 사이니지 축. 범위 밖 |
| `api/assetSnapshot.ts#assetSnapshotApi.list` | 위 cms 소비처가 남아 있어 dead 아님 | 유지 |
| `cosmetics.routes.ts` `/assets` mount | 위 소비처의 backend | 유지 |

> **발견(별도 트랙 제안)**: `HubContentPage` 의 `afterCopyAction` / `infoLinks` 가 `/store/library/contents` 를 가리키지만, 복사본은
> `cms` snapshot 으로 저장돼 이 탭(before: `type=content` / after: B+D)에는 **나타나지 않는다**. HUB 콘텐츠 복사본의 매장 측 착지
> (B 로 copy-on-import 할지, cms snapshot 전용 화면을 둘지)는 HUB 복사 흐름 설계 판단이라 이번 WO 에서 손대지 않았다.

---

## 5. 회귀 (step 10)

| 검증 | 결과 |
|---|---|
| `jest kcos-library-content-bd-canonical.spec.ts` | 13/13 PASS |
| `jest cosmetics-store-content-tenant-scope.spec.ts` (선행 WO) | PASS |
| `jest kcos-pop-v2-canonical-adoption.spec.ts` | PASS |
| `tsc --noEmit` web-k-cosmetics | 0 errors |
| `tsc --noEmit` packages/store-ui-core | 0 errors |
| `tsc --noEmit` web-kpa-society · web-pharmacy-hub (공통 패키지 소비처) | 0 errors |
| eslint (변경 8 파일) | 0 |
| KPA / PH 자료함 · POP 코드 | 변경 0 (git diff 에 KPA/PH 경로 없음) |

---

## 6. Production E2E — API (step 9 · 11, 배포 전 backend 호환 확인, 2026-09-11)

계정 renagang21 (KPA ∩ KCos 양쪽 회원). `api.neture.co.kr`, read-only GET 만.

| 호출 | 결과 |
|---|---|
| `GET /cosmetics/store-contents` (B) | 200 n=0 (KCos org 에 아직 매장 콘텐츠 없음) |
| `GET /cosmetics/store/assets` (D) | 200 n=5 · active 5 · assetType {content, file} |
| `GET /cosmetics/assets?type=content` (이전 source · 이제 미사용) | 200 n=0 |
| `GET /kpa/store-contents` · `/kpa/store/assets` (KPA 대조) | 200 n=15 · n=13 |
| cross-service id 교집합 B∩KPA-contents / D∩KPA-assets | **0 / 0** |
| `GET /cosmetics/pharmacy/pop-v2/sources/contents` | 200 n=5 · origins = {library} — D 5/5 가 `library` 로 존재 |
| `GET …/sources/content/library/{D id}` ×2 | **200** (resolve OK) |
| `…/sources/content/direct/{B id}` | B 행 0 → 호출 대상 없음. 계약은 resolver 소스(§5 spec) + 선행 WO tenant spec 으로 고정. production 에 테스트 콘텐츠를 만들지 않았다(운영 데이터 write 금지) |

## 7. Production E2E — 브라우저 (step 11)

계정 renagang21 · `https://k-cosmetics.site` · headless Chrome (Playwright) · 배포 revision `k-cosmetics-web-01112-5zq` · 2026-09-11.

| 항목 | 결과 |
|---|---|
| 로그인 → `/store/library/contents` | 200 · 제목 '콘텐츠' · 부제 '내 매장이 보유한 콘텐츠와 제작 자료…' (HUB 가져오기 문구 0) |
| 페이지가 호출한 API | `GET /cosmetics/store-contents` 200 · `GET /cosmetics/store/assets?limit=100` 200 — **`/cosmetics/assets` 호출 0** |
| 표시 행 | 5행 (D 실행 자산 5 · 배지 '제작 자료') · '제작 시작' 버튼 5 — KPA 데이터 0 (§6 교집합 0) |
| POP V2 handoff | 첫 행 → 제작 시작 → POP → `/store/marketing/pop-v2` 이동 · `GET /cosmetics/pharmacy/pop-v2/sources/content/library/35b88ac2…` **200** · `GET …/sources/contents` 200 · 화면에 "사용할 콘텐츠" 로 해당 자산 선택 상태 · "기본 문구 출처: 내 매장 콘텐츠" |
| console error / page error / 4xx·5xx | **0 / 0 / 0** |

KPA / PH: 이번 diff 에 KPA·PH 화면 코드 없음 + 공통 패키지 소비처 tsc 0 errors + KPA API 대조(§6) 정상 → 코드·API 기준 회귀 없음 (브라우저 재smoke 는 생략).

---

## 8. 완료 블록

```text
KCOS LIBRARY CONTENT SOURCE      = B+D CANONICAL
KPA SNAPSHOT DEPENDENCY          = 0        (콘텐츠 탭 기준 · cms/signage copy 는 범위 밖 보존)
CROSS-SERVICE CONTENT EXPOSURE   = 0
POP V2 SOURCE COMPATIBILITY      = PASS     (library resolve 200 · direct 는 계약 고정)
KPA / PH REGRESSION              = PASS
SCHEMA CHANGE                    = 0
PRODUCTION E2E                   = PASS
```

## 9. 범위 밖 · 후속

- `/store-assets` ↔ `/store/channels` 축 (별도 트랙, 선행 CHECK PRESERVED_WITH_REASON)
- Neture `/api/v1/neture/assets` KPA 하드코딩 (별도 트랙)
- HUB 콘텐츠 복사본(cms snapshot) 의 매장 측 착지 불일치 (§4-3 발견 · 별도 WO 제안)
- 다음 체인 ③ `StoreContentsSelector` 인라인 생성 V2 이관
