# CHECK-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1

- **WO**: WO-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1
- **작업일**: 2026-09-11
- **입력**: `IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1-PASS2` F01 (P0)
- **worktree / branch**: `C:\tmp\o4o-kcos-channel` · `work/kcos-store-channel-tenant-v1` (base `8f2a3a048`)
- **커밋**: `cf464a6f3` (수정) · 배포 API/Web/Admin success
- **schema / migration / production write**: **0 · 0 · 0**

---

## 1. 결함 (P0)

`cosmetics.routes.ts:183` 가 **KPA 전용** `createStoreAssetControlController` 를 `/store-assets` 에 그대로 마운트했다.

```text
isStoreOwner(…, 'kpa')  →  KPA 조직     (두 서비스 가입자)
KpaMember fallback      →  KPA 조직
kpa_store_asset_controls 읽기(LEFT JOIN) + 쓰기(publish/channel PATCH upsert)
```

K-Cosmetics 소비처 2곳이 이를 썼다:

| 소비처 | 경로 | 동작 |
|---|---|---|
| `StoreChannelsPage` → 공통 `StoreChannelsView` | `/store/channels` (메뉴 `[채널] 채널 관리`) | [B] 노출 콘텐츠/강제노출 KPI · [E] 노출 자산 리스트 · 게시/채널 토글 |
| `StoreAssetsPage` → `StoreAssetsView`(policy-core) | `/store/content` (메뉴 없음 · 채널 화면 "전체 자산 보기" 버튼) | 게시 상태 토글/일괄 |

즉 K-Cosmetics 사용자가 **KPA 약국 조직**의 스냅샷 게시 상태를 보고, 토글하면 **KPA 조직 행**을 쓰는 구조였다.

---

## 2. `/store/channels` 업무 기능 해부 (§2)

이름이 `channels` 라고 하나의 기능이 아니다. 공통 `StoreChannelsView` 는 5블록이다.

| 블록 | 기능 | 원장 | 조직 해석 | 판정 |
|---|---|---|---|---|
| [A] 채널 탭 (B2C/KIOSK/TABLET/SIGNAGE) · 상태 | `organization_channels` | `store-hub` mount `'cosmetics'` ✓ | **COMMON_CHANNEL_CAPABILITY** — 유지 |
| [B] KPI 상태·노출 상품 | `organization_channels` | ✓ | 유지 |
| [B] KPI **노출 콘텐츠 · 강제노출** | `kpa_store_asset_controls` | ❌ KPA | **KPA_ONLY** |
| [C] Quick Actions · 미리보기 | — | — | 유지 ("전체 자산 보기" 만 KPA_ONLY) |
| [D] 채널 제품 목록/추가/순서 (B2C·KIOSK) | product-channel mapping | `channel-products` mount `'cosmetics'` ✓ | 유지 |
| [E] 노출 자산 리스트 (게시/채널 토글) | `kpa_store_asset_controls` | ❌ KPA | **KPA_ONLY** |

**KPA_ONLY 로 판정한 근거** — 이 축은 KPA HUB 운영 확장(본사 강제 배포 `is_forced` · 게시 `publish_status` · 채널 매핑 `channel_map`)이며,
K-Cosmetics 에는 대응 **원장·데이터·업무**가 없다.

---

## 3. consumer graph (§3)

```text
storeMenuConfig COSMETICS [채널] 채널 관리  (/channels)
  → StoreChannelsPage (KCos)
      → StoreChannelsView (store-ui-core · 소비처 KCos 1곳 — KPA 는 자체 페이지)
          ├ fetchChannelOverviewWithCode / createChannel / channel products  → /cosmetics/store-hub/*  ('cosmetics' ✓)
          └ listAssets / updateAssetPublishStatus / updateAssetChannelMap    → storeAssetControlApi
                → GET/PATCH /cosmetics/store-assets
                    → createStoreAssetControlController  (KPA 전용)
                        → isStoreOwner(…,'kpa') + KpaMember fallback
                            → o4o_asset_snapshots ⋈ kpa_store_asset_controls (KPA org)   ← 읽기 유출
                            → kpa_store_asset_controls upsert (KPA org)                  ← 쓰기 유출(경로 존재)
(메뉴 없음) /store/content → StoreAssetsPage → StoreAssetsView → 같은 storeAssetControlApi
```

---

## 4. production 사용성 (§4 · read-only)

| 항목 | 실측 |
|---|---|
| `/api/v1/cosmetics/store-assets` 60일 요청 | **GET 18 · OPTIONS 14 · PATCH 0** |
| 발생일 | 08-13(2) · 08-19(12) 브라우저 로드 · 09-11 00:25~00:30 (4, OPTIONS 없음 = curl 검증) |
| mutation | **0** — 게시/채널 토글은 한 번도 호출되지 않았다 |
| `kpa_store_asset_controls` 최종 갱신 | 05-15 · 06-25 · 07-25 — **KCos 접속일과 겹치지 않음** |
| KCos 조직(`83ff96c7`) 보유 | 스냅샷 0 · controls 0 · `organization_channels` 0 |
| k-cosmetics enrolled 전 조직 `organization_channels` | **0행** |

→ 쓰기 유출은 **경로만 있었고 발생하지 않았다.** 읽기 유출은 14회 브라우저 로드(개발 smoke 성격)에서 발생했다.

---

## 5. 판정 — 선택 A (자산 통제 축만 은퇴)

| 후보 | 판단 |
|---|---|
| B. KCos canonical 로 재표현 | `organization_channels` 는 채널 상태, `store_execution_assets`/POP V2/QR 은 자산 — **"자산의 게시 상태·채널 매핑·본사 강제"** 를 표현할 기존 모델이 없다. 새 entity 필요 → **중지 조건 2** |
| **A. 은퇴** | 축의 원장·데이터·업무·mutation 이 전부 0. 채널 탭·상태·제품 노출([A]~[D])은 `'cosmetics'` 스코프로 정상이라 **화면은 유지**하고 축만 뺀다 |

`serviceKey='cosmetics'` 로 바꾸는 안은 채택하지 않았다 — KCos 조직 행을 `kpa_store_asset_controls` 에 쌓는 것은 KPA 확장 레이어를 KCos 가 채택하는 결정이고(선행 IR §10), 그 기능 자체가 KCos 에 없다.

---

## 6. 변경 (KPA 파일 무변경)

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/.../StoreChannelsView.tsx` | `listAssets`·`updateAssetPublishStatus`·`updateAssetChannelMap` **optional**. 미주입 시 자산 fetch 0 · 자산 KPI 2종 · [E] 리스트 · "전체 자산 보기" 미렌더 (`hasAssetControl` 게이트 4곳). 소비처 KCos 1곳 |
| `services/web-k-cosmetics/.../StoreChannelsPage.tsx` | 세 함수 주입 제거 · [A]~[D] 계약 그대로 |
| `services/web-k-cosmetics/.../StoreAssetsPage.tsx` | redirect-only → `/store/library/contents` (메뉴 진입점 없던 경로) |
| `services/web-k-cosmetics/src/api/assetSnapshot.ts` | `storeAssetControlApi` + 응답 타입 제거 · `assetSnapshotApi`(copy/list) 유지 |
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` | `/store-assets` 마운트 + import 제거 |
| `__tests__/kcos-store-channel-asset-tenant.spec.ts` | 신규 13 |
| `__tests__/kcos-library-content-bd-canonical.spec.ts` | 선행 WO 의 "이 축은 손대지 않았다" 가드 2건을 새 계약으로 갱신 (회귀 아닌 의도된 변경) |

`kpa_store_asset_controls` · `store-asset-control.controller` · `kpa.routes.ts` · `StoreAssetsView`(policy-core, KPA 소비) — **무변경**.

---

## 7. 검증

### 7-1. 로컬

| 항목 | 결과 |
|---|---|
| 신규 spec | **13/13** |
| `kcos-*` 4 suite (개별 실행) | **42/42** |
| `cosmetics-*-scope` 2 suite | **28/28** |
| api-server `tsc` | PASS |
| `type-check:frontend` | OK (6 서비스) |
| KCos `vite build` | OK |
| lint-ratchet | 45 ≤ 51 |
| 전체 api-server suite (`--max-old-space-size=6144`) | **256/258 suite · 4221/4224** — 실패 3건은 `windows-app-window-control` · `ai-capability-tool-routing` · `local-agent-oneclick-pairing`(local-agent/AI 영역 · 고정 port · 한글 ASCII 이스케이프 raw-source) — **본 변경과 무관** (CLAUDE.md 중지 조건 → 보고) |

`kcos-*` 4 suite 를 한 프로세스에서 돌리면 로컬 기본 heap 에서 OOM 이 난다(개별·heap 확장 시 전부 PASS). 하네스 한계로 기록.

### 7-2. production E2E (배포 `cf464a6f3` · 동일 계정 `renagang21` · 3서비스 조직 보유)

| # | 확인 | 결과 |
|---|---|---|
| 1 | `GET /cosmetics/store-assets` | **404** (마운트 제거) |
| 2 | `GET /kpa/store-assets` (같은 세션) | **200 · KPA 조직(9c87f46b) 단일** — KPA 회귀 0 |
| 3 | `GET /cosmetics/store-hub/channels` | 200 (유지 축) |
| 4 | PH `/store-owner/library` | 200 |
| 5 | **브라우저** `/store/channels` (L1 토큰 주입 §4-2) | 렌더 OK · `/store-assets` 호출 **0** · 노출 콘텐츠/강제노출 KPI **0** · "전체 자산 보기" **0** · API 호출 = `store-hub/capabilities`·`store-hub/channels` 200 · **console 0 · pageerror 0 · 4xx/5xx 0** |
| 6 | **브라우저** `/store/content` | → `/store/library/contents` redirect · `/store-assets` 호출 0 |
| 7 | `kpa_store_asset_controls` (read-only) | **7행 · 3 KPA 조직 · 최종 갱신 2026-07-25 · KCos 조직 행 0** — 불변 |

#5 의 화면은 KCos 조직 `organization_channels` 0행이라 **빈 상태("아직 등록된 채널이 없습니다" + B2C 채널 만들기)** 로 렌더됐다.
[A]~[D] 의 채널 탭 UI 자체는 데이터가 없어 이 조직에서는 펼쳐지지 않았다 — 사실대로 남긴다.

### 7-3. CI

`cf464a6f3` 의 CI Pipeline/CodeQL 은 직후 push(`c4ddac38c`, local-agent) 에 의해 **cancelled** 됐다.
`c4ddac38c` 는 본 변경을 포함하는 상위 집합이며 그 CI 완주를 문서 push 의 전제로 삼았다(취소로 실패를 숨기지 않기 위해).

---

## 8. 완료 조건

```text
KCOS STORE CHANNEL BUSINESS ROLE      = CLOSED   ([A]~[D] COMMON · [B]일부/[E] KPA_ONLY → 은퇴)
KCOS KPA ORG FALLBACK                 = 0
KCOS KPA ASSET CONTROL DEPENDENCY     = 0        (mount 0 · api 0 · 주입 0)
CROSS-SERVICE READ                    = 0        (404)
CROSS-SERVICE WRITE                   = 0        (경로 제거 · 이력상으로도 PATCH 0)
KPA_STORE_ASSET_CONTROLS              = PRESERVED (7행 불변)
KPA / PH REGRESSION                   = PASS
SCHEMA CHANGE                         = 0
PRODUCTION E2E                        = PASS

P0 KCOS STORE-CHANNEL TENANT RISK     = CLOSED
```

다음: Neture `/assets` 1줄 제거 + dead package/generated artifacts 를 묶은 housekeeping WO.

---

## 9. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
