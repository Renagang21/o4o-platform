# IR-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMEDIATION-V1

> K-Cosmetics 사이니지 엔티티에 남아 있는 **product 직접 관계**가 어디에서 어떻게 쓰이는지 조사하고,
> O4O 원칙 "디지털 사이니지는 제품 파생 콘텐츠가 아니다" 기준에 맞춰 **안전한 제거/분리 방안**을 설계한다.
>
> **조사 전용 — 코드/엔티티/마이그레이션/UI 수정 없음.**

- **작성일:** 2026-06-05
- **분류:** Investigation (IR) — 설계 판단
- **상태:** Complete (권장 조치안 + 후속 WO 제안 포함)
- **선행:** [`IR-O4O-STORE-PRODUCT-TRADE-AND-ACTIVATION-FLOW-AUDIT-V1`](IR-O4O-STORE-PRODUCT-TRADE-AND-ACTIVATION-FLOW-AUDIT-V1.md) §12 R1 (HIGH)
- **원칙 근거:** `CLAUDE.md` (signage ↔ product 직접 관계 금지), `docs/baseline/KPA-SIGNAGE-STRUCTURE-V1.md`, `O4O-STORE-MENU-CANONICAL-TREE-V1` §1.1·§3.1 (사이니지=동영상/플레이리스트/방영, 제품 파생 아님)

---

## 1. 목적

K-Cosmetics 사이니지에 `product_id` 직접 관계가 남아 있다(IR-AUDIT §12 R1). 이는 단순 UI 정리가 아니라
**데이터 모델·기존 데이터·마이그레이션·화면 의미·장기 원칙**이 얽힌 문제이므로, 코드 WO 전에 설계로 잠근다.

본 IR 은 "그 관계가 실제로 살아 있는가"를 실측하고, 제거/분리 방안을 권고한다.

---

## 2. 조사 대상

- `packages/dropshipping-cosmetics/src/backend/entities/signage-playlist.entity.ts`
- `packages/dropshipping-cosmetics/src/backend/entities/campaign.entity.ts`
- K-Cosmetics signage 관련 service/controller/route (dropshipping-cosmetics 모듈)
- K-Cosmetics store signage 화면 (`services/web-k-cosmetics/.../store/StoreSignagePage.tsx`)
- 관련 migration / 활성 store playlist 스키마
- `productId` / `type='product'` / `signagePlaylistId` / `products[]` 전체 검색
- 비교군: `packages/digital-signage-core` (KPA/GP 표준)

---

## 3. 두 개의 사이니지 경로 (핵심 구분)

K-Cosmetics 에는 **이름이 비슷한 두 개의 사이니지 플레이리스트 구현**이 공존한다. 이 구분이 R1 판단의 핵심이다.

| 경로 | 엔티티/테이블 | item 구조 | product 관계 | 상태 |
|---|---|---|---|---|
| **(A) 활성 매장 사이니지** | `cosmetics_store_playlists` / `cosmetics_store_playlist_items` (migration 20260212000003) | `asset_type VARCHAR` + `reference_id UUID` | **없음** (snapshot 기반) | **ACTIVE** — StoreSignagePage 가 사용 |
| **(B) 문제의 product 결합** | `CosmeticsSignagePlaylist` / `CosmeticsCampaign` (entity only) | JSONB `items[]` `{type:'product', productId}` / `products[]` | **있음** | **DEAD** — 테이블·마운트·UI 도달 없음 |

→ **매장 경영자가 실제로 쓰는 사이니지(A)에는 product 관계가 없다.** R1 의 product 관계는 별도의 (B) 자동 캠페인/플레이리스트 서브시스템에만 존재한다.

---

## 4. 조사 항목별 결과

### 4.1 product 직접 관계가 실제 런타임에서 사용되는가? → **아니오 (DEAD)**

- (B) `CosmeticsSignagePlaylist.items[].productId`, `CosmeticsCampaign.products[].productId` 는 entity + service 코드에 존재(`signage-playlist.service.ts:138-212`, `campaign.service.ts:215-243`의 자동 매핑 로직).
- 그러나:
  - **마이그레이션 없음** → `cosmetics_signage_playlists` / `cosmetics_campaigns` **테이블 미생성**.
  - api-server 에서 `cosmetics/signage(playlists|auto-playlist)` / `cosmetics/campaigns` **마운트 흔적 없음**(검색 결과 무관한 kpa.routes 만). 모듈 `module.ts:50-74`의 `routes` 배열에는 `createSignagePlaylistRoutes`/`createCampaignRoutes`가 등록되나, 그 module routes 가 실제 api-server 에 통합되는 지점은 확인되지 않음.
  - K-Cosmetics frontend 에 campaign 페이지 없음, product→signage 진입 UI 없음.

### 4.2 기존 데이터가 있는가? → **없음(코드 레벨). prod 재확인 권장**

- (B) 테이블이 마이그레이션으로 생성되지 않으므로 정상 배포 DB 에는 테이블·데이터가 없을 것으로 판단.
- ⚠️ 단, TypeORM `synchronize` 또는 수동 생성 가능성 배제를 위해 **제거 실행 전 read-only 확인**(아래 §7 검증)을 권고.

### 4.3 제거 가능한 dead field인가, migration 필요한 active field인가? → **DEAD (제거 대상)**

- (B)는 테이블·활성 라우트·UI 도달이 모두 없는 schema/코드. 활성 매장 사이니지(A)와 분리돼 있어 제거해도 매장 흐름 무영향.
- 제거 시 **drop migration 불필요**(테이블이 없으므로). 엔티티/route/service/DTO 코드 제거가 핵심.

### 4.4 campaign.products + signagePlaylistId 의 UX 의미 → **자동 캠페인→사이니지 자동편성(미완·미연결)**

- 설계 의도: 브랜드/카테고리/관심사 필터로 상품을 모아 캠페인을 만들고, 그 캠페인을 사이니지 플레이리스트로 자동 편성.
- 실제: `generateAutoCampaign`(campaign.service.ts:195-273)은 products 만 모으고 **signagePlaylistId 를 할당하지 않음** → campaign↔signage 연결조차 미완. 즉 UX 로 작동하지 않는 미완 기능.

### 4.5 digital-signage-core(KPA/GP) 모델과의 차이

| 항목 | digital-signage-core (표준) | cosmetics (B) |
|---|---|---|
| items 저장 | 별도 테이블 `signage_playlist_items` (FK `mediaId`→`signage_media`) | JSONB `items[]` 단일 컬럼 |
| product 참조 | **없음** (콘텐츠는 media, 상품정보는 media.metadata) | `productId` 직접 필드 |
| campaign 연결 | 없음 | `signagePlaylistId` |
| 마이그레이션 | 존재(2026011700001) | 없음 |

→ core 가 canonical. cosmetics (B)는 표준 이탈 + 미완.

### 4.6 product 관계 제거 시 대체 표현이 필요한가? → **불필요**

- 활성 매장 사이니지(A)는 이미 `asset_type` + `reference_id`(snapshot) 로 동작. "상품을 사이니지에 노출"하려면 **상품 → 동영상/이미지 자산(snapshot/media) 로 변환 후 플레이리스트에 추가**하는 간접 경로가 정답(원칙 정합).
- 즉 product 직접 결합을 제거해도 기능 손실 없음. 필요 시 "상품 기반 자료 만들기"는 활성화 영역(POP/상품설명/사이니지용 자산)에서 자산을 만들어 사이니지로 가져가는 흐름으로 표현.

### 4.7 DB migration 필요 여부 → **불필요(drop 대상 테이블 없음)**

- 단, **엔티티를 남겨두면** 향후 누군가 마이그레이션/synchronize 로 product 결합 테이블을 실체화할 위험이 있으므로, **엔티티/모듈 등록 자체를 제거**하여 재생 가능성을 차단하는 것을 권고.

### 4.8 frontend/API 회귀 위험 → **LOW**

| 유지(영향 없음) | 제거 영향 |
|---|---|
| 활성 매장 사이니지 (A) `cosmetics_store_playlists` + StoreSignagePage(snapshot) | — |
| `SignageContentMapperService`(sample/display/alert 콘텐츠) | — |
| store-playlists controller (`/cosmetics/store-playlists`) | — |
| | (B) `CosmeticsSignagePlaylist`/`CosmeticsCampaign` entity·service·route·DTO 제거 |
| | admin-dashboard auto-playlist/auto-campaign UI (테이블 부재로 이미 비작동 추정 — 제거 전 확인) |

### 4.9 권장 조치안

| 안 | 내용 | 평가 |
|---|---|---|
| A. 즉시 제거 | (B) 엔티티/service/route/DTO/모듈 등록 일괄 제거 | 가능하나 admin-dashboard 사용·prod 테이블 부재 **검증 후** 실행 |
| **B. deprecated 후 후속 제거 (권장)** | 1차: 엔티티에 deprecation 주석 + 모듈 route 등록 해제(도달 차단) + 검증, 2차 WO 에서 파일 삭제 | **권장** — 안전하게 단계적 |
| C. 유지하되 비사용 보장 | 코드 남기고 가드만 | 비권장 — 원칙 위반 코드 잔존, 재실체화 위험 |
| D. 다른 관계 모델로 이전 | product→media 변환 레이어 신설 | 과잉 — 대체 경로(A) 이미 존재, 불필요 |

**권장: B (deprecated → 후속 제거).** campaign 은 product-signage 결합(`products[]`/`signagePlaylistId`)만 끊고, 캠페인 CRUD 자체의 향후 용도가 있으면 별도 판단(현재 frontend 미사용이므로 함께 제거도 가능).

### 4.10 후속 WO 제안

| WO | 내용 | 선행 |
|---|---|---|
| `WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1` | (B) 엔티티/service/route/DTO/모듈 등록 제거(또는 deprecate→제거 2단계). 활성 (A)·SignageContentMapperService·store-playlists 무접촉 | 본 IR + §7 검증 |
| `WO-O4O-COSMETICS-SIGNAGE-STORE-PLAYLIST-CORE-CONVERGENCE-V1`(후보) | 활성 (A) `cosmetics_store_playlists` 를 digital-signage-core 표준으로 수렴 검토 | 위 제거 후 |
| (참고) `WO-O4O-COSMETICS-SIGNAGE-VIDEO-SCHEDULE-TABS-V1`(IR-AUDIT §13-6) | KC 사이니지 동영상/스케줄 탭 구현 — **R1 제거 후 진행**해야 원칙 충돌 없음 | 본 제거 후 |

---

## 5. Consumer Impact Matrix

| 소비처 | 사용 여부 | 조사 영향 | 비고 |
|---|---:|---|---|
| K-Cosmetics | 사용 | 있음 | 활성 사이니지(A)는 product 무관, (B)만 dead — 제거 대상 |
| KPA-Society | 사용 | 없음 | digital-signage-core 표준 사용, (B) 미사용 |
| GlycoPharm | 사용 | 없음 | 동일하게 (B) signage-playlist 코드 존재하나 미사용(별도 정리 후보) |
| Neture | 미사용 | 없음 | 매장 사이니지 대상 아님 |
| admin / operator | 부분 | 확인 필요 | admin-dashboard auto-playlist/auto-campaign UI 의 (B) 의존 여부 — 제거 전 확인 |

---

## 6. Risks (조사 시점)

| # | Risk | 등급 | 비고 |
|---|---|---|---|
| 6-1 | (B) 엔티티가 모듈에 등록돼 있어 향후 synchronize/마이그레이션으로 product 결합 테이블이 **실체화**될 수 있음 | MED | 엔티티 제거로 차단 권고 |
| 6-2 | admin-dashboard 가 (B) 라우트를 직접 호출 중일 가능성(미확정) | LOW | 제거 전 확인 항목 |
| 6-3 | GlycoPharm 에도 동일 (B) 계열 코드 존재 가능 — 별도 점검 필요 | LOW | 후속 점검 |

---

## 7. 제거 실행 전 검증 (후속 WO 선행 조건)

1. dropshipping-cosmetics 모듈의 `routes` 가 api-server 런타임에 **실제 마운트되는지** 정적 추적(통합 지점 확정).
2. admin-dashboard 에서 (B) 엔드포인트(`/cosmetics/signage/auto-playlist`, `/cosmetics/campaigns/*`) 호출 코드의 실사용 여부.
3. 프로덕션 DB 에 `cosmetics_signage_playlists` / `cosmetics_campaigns` 테이블·row 부재 **read-only 확인**(gcloud SQL SELECT — CLAUDE.md §0 허용 범위). 존재 시 데이터 의미 재평가.

---

## 8. Out of Scope

본 IR 은 조사·설계 전용. 코드 수정 / entity 수정 / migration 작성 / UI 수정 / 배포 **없음**. StoreSidebar·storeMenuConfig·menuCapabilityMap·HeroBannerSection 등 타 영역 무접촉.

---

## 9. Evidence

- 엔티티: `packages/dropshipping-cosmetics/src/backend/entities/signage-playlist.entity.ts:10-17`(PlaylistItem.productId), `campaign.entity.ts:33-37`(products[]), `:45-46`(signagePlaylistId)
- service: `signage-playlist.service.ts:138-212`(product 매핑), `campaign.service.ts:195-273`(generateAutoCampaign — signagePlaylistId 미할당)
- route/module: `routes/signage-playlist.routes.ts`, `routes/campaign.routes.ts`, `module.ts:50-74`(routes 등록), api-server 마운트 미발견
- 마이그레이션: (B) 부재 / 활성 (A) `apps/api-server/src/database/migrations/20260212000003-CreateCosmeticsStorePlaylistTables.ts:37-55`(`asset_type`+`reference_id`, product 무관)
- 표준 비교: `packages/digital-signage-core/src/backend/entities/SignagePlaylist(Item).entity.ts`(product 없음)
- frontend 활성 경로: `services/web-k-cosmetics/src/pages/store/StoreSignagePage.tsx`(assetSnapshotApi.copy → addPlaylistItem, snapshot 기반)

---

**작성:** O4O Platform Team · 2026-06-05
**상태:** Complete — 권장 조치 B(deprecated→제거), §7 검증 후 `WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1`
