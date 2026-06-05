# IR-O4O-STORE-PRODUCT-TRADE-AND-ACTIVATION-FLOW-AUDIT-V1

> 내 매장 / 내 약국 메뉴 트리 정비 완료 상태에서, **이미 구현된** 상품·거래 / 제품 기반 활성화 /
> 자료함 / 디지털 사이니지 흐름의 실제 구현 상태를 실측한다. **신규 구현 없음 — 조사 전용.**

- **작성일:** 2026-06-05
- **분류:** Investigation (IR)
- **상태:** Complete (조사 결과 — 후속 WO 후보 제안 포함)
- **선행:** `WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2`, capability fix `09c7aa5f1`, `WO-O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`
- **프로토콜:** [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) (Consumer Impact Matrix 포함)

---

## 1. Summary

- **메뉴 트리는 3개 서비스 공통 정렬 완료**(storeMenuConfig.ts), 그러나 **실제 구현은 심하게 불균형**하다.
- **KPA-Society 가 사실상 reference implementation**(대부분 FULL), **GlycoPharm·K-Cosmetics 는 FUNCTIONAL~PARTIAL**(공통 패키지 흐름은 공유하나 고급/통합 기능 미완).
- **제품 기반 활성화(상품설명/POP/QR/블로그)는 3개 서비스 모두 라우트·컴포넌트 존재** — "이미 있는데 연결/통일만 필요"한 영역. 신규 제작 거의 불필요.
- **상품·거래는 서비스별 성숙도 격차가 큼**: KPA 상품·주문 FUNCTIONAL, GlycoPharm 상품 화면은 **PLACEHOLDER(백엔드 미연결)**, K-Cosmetics 는 상품/거래신청 자체가 MISSING(주문만).
- **설계 리스크 1건 확정**: K-Cosmetics 사이니지 엔티티가 **product_id 직접 관계**를 가짐(`PlaylistItem.type='product'`, `productId`). CLAUDE.md/Store Menu Canonical 의 "signage ↔ product 직접 관계 금지" 원칙 위반. 본 IR 에서는 기록만.
- 가장 가치 있는 후속: **KPA에서 안정화된 활성화/자료함 흐름을 GP·KC로 공통화**(신규가 아니라 확장).

---

## 2. Scope

- **대상:** KPA-Society / GlycoPharm / K-Cosmetics 의 `/store` 영역
- **제외:** Neture (내 매장 기능 대상 아님 — §4 Consumer Impact Matrix 에 "미사용" 기록)
- **조사 흐름:** 상품·거래 / 제품 기반 활성화 / 자료함 / 디지털 사이니지
- **방법:** 코드 검색 + route mount 확인 + menu config + component 실측 (브라우저 smoke 는 배포 후 별도)

---

## 3. Current Canonical Tree

기준 메뉴: `packages/store-ui-core/src/config/storeMenuConfig.ts` (V2 정렬).

- KPA/GP: `약국 상품·거래` / `약국 활성화` / `약국 자료함` / `디지털 사이니지` / `채널`(GP=마케팅·채널+경영) / `분석` / `설정`
- KC: `매장 상품·거래` / `매장 활성화` / `내 자료함` / `디지털 사이니지` / `채널` / `분석` / `설정`

> 주의: IR 요청서의 트리에 적힌 `분석`의 `상품 성과` / `콘텐츠·채널 성과` 와 `설정`의 `노출 설정` 은
> **실제 라우트가 없다**(현재 `분석`=마케팅 분석, KC만 매출 요약). 메뉴 config 에도 미포함. §10 갭 참조.

---

## 4. Consumer Impact Matrix

| 소비처 | 사용 여부 | 조사 영향 | route/role/capability 확인 | 결과 |
|---|---:|---|---|---|
| KPA-Society | 사용 | 있음 | storeMenuConfig + /store route 전수, capability filter(09c7aa5f1 이후 products/orders de-map) | NOTE — reference 구현, 일부 갭 |
| GlycoPharm | 사용 | 있음 | /store route, 상품(/management/b2b)·거래신청(/b2b-order) | NOTE — 상품 PLACEHOLDER, 활성화 FUNCTIONAL |
| K-Cosmetics | 사용 | 있음 | /store route, 주문/상품 흐름, signage 엔티티 | NOTE — 상품·거래 최소, signage product 관계 RISK |
| Neture | 미사용 | 없음 | 내 매장 기능 대상 아님 (storeMenuConfig 에 config 없음) | PASS |
| admin / operator | 부분 | 간접 | 본 IR 은 store(매장 경영자) 영역 — admin/operator 콘솔은 범위 외 | PASS(범위 외) |

---

## 5. Route/Menu Matrix

### 5.1 상품·거래

| Service | Label | Route/SubPath | Component | Exists | 상태 |
|---|---|---|---|---|---|
| KPA | 상품 | /store/commerce/products | PharmacyB2BPage | YES | FUNCTIONAL |
| KPA | 주문 관리 | /store/commerce/orders | StoreOrdersPage | YES | FUNCTIONAL |
| KPA | (거래 신청) | — | — | NO | MISSING (주문 작업대로 우회) |
| GP | 상품 | /store/management/b2b | PharmacyB2BProducts | YES | **PLACEHOLDER (B2B API 미연결)** |
| GP | 거래 신청 | /store/b2b-order | B2BOrderPage | YES | FUNCTIONAL |
| GP | 주문 관리 | /store/commerce/orders | PharmacyOrders | YES | FUNCTIONAL |
| KC | 주문 관리 | /store/commerce/orders | StoreOrdersPage | YES | FUNCTIONAL |
| KC | (상품/거래 신청) | — | — | NO | MISSING (공급자 거래 화면 부재) |

### 5.2 제품 기반 활성화

| Service | Label | Route/SubPath | Component | Exists | 상태 |
|---|---|---|---|---|---|
| KPA | 내 약국 제품 | /store/my-products | StoreProductsManagerPage(@o4o/store-products-ui) | YES | FULL (row action 포함) |
| KPA | 상품 설명 | /store/marketing/product-descriptions | StoreProductDescriptionsPage | YES | FULL |
| KPA | POP | /store/marketing/pop | StorePopPage | YES | FULL (AI/PDF/analytics) |
| KPA | QR-code | /store/marketing/qr | StoreQRPage | YES | FULL (AI 제목/통계/일괄 PDF) |
| KPA | 블로그 | /store/content/blog | PharmacyBlogPage | YES | FULL (일괄 작업) |
| GP | 내 약국 제품 | /store/my-products | StoreProductsManagerPage | YES | FUNCTIONAL |
| GP | 상품 설명 | /store/library/product-descriptions | StoreProductDescriptionsPage | YES | FUNCTIONAL |
| GP | POP | /store/marketing/pop | StorePopPage | YES | FUNCTIONAL (supplier items 중심) |
| GP | QR-code | /store/marketing/qr | StoreQrPage | YES | FUNCTIONAL (기본 CRUD, AI 없음) |
| GP | 블로그 | /store/content/blog | PharmacyBlogPage | YES | FUNCTIONAL |
| KC | 내 매장 제품 | /store/my-products | StoreProductsManagerPage | YES | FUNCTIONAL |
| KC | 상품 설명 | /store/library/product-descriptions | StoreProductDescriptionsPage | YES | FUNCTIONAL |
| KC | POP | /store/marketing/pop | StorePopPage | YES | FUNCTIONAL |
| KC | QR-code | /store/marketing/qr | StoreQrPage | YES | FUNCTIONAL (생성 버튼 존재) |
| KC | 블로그 | /store/content/blog | StoreBlogManagePage | YES | FUNCTIONAL |

> 설계 메모: 상품 설명/POP/QR 의 "새로 만들기" 버튼은 KPA에서 **의도적으로 제거**되어 진입점이
> `내 자료함 → 제작 시작` 또는 제품 row action 으로 일원화됨(WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1).
> KC QR 은 화면 내 "생성" 버튼이 남아 있어 서비스 간 진입 UX 가 불일치(§10).

### 5.3 자료함

| Service | Label | Route/SubPath | Component | Exists | 상태 |
|---|---|---|---|---|---|
| KPA | 콘텐츠 | /store/library/contents | StoreLibraryContentsPage | YES | FULL (콘텐츠/강의 이중 탭) |
| KPA | 자료 | /store/library/resources | StoreLibraryResourcesPage | YES | FULL (2-source 통합+등록/삭제/상세) |
| KPA | 제작 자료 | /store/library/production-materials | StoreProductionMaterialsPage | YES | FULL (POP/QR/블로그 통합 + derivation viewer) |
| GP | 콘텐츠/자료/제작 자료 | /store/library/* | (동명 컴포넌트) | YES | FUNCTIONAL(콘텐츠) / PARTIAL(자료·제작자료, Phase 2-B/2-D) |
| KC | 콘텐츠/자료/제작 자료 | /store/library/* | (동명 컴포넌트) | YES | FUNCTIONAL(콘텐츠) / PARTIAL(자료·제작자료) |

### 5.4 디지털 사이니지

| Service | Tabs | Component | 상태 |
|---|---|---|---|
| KPA | 동영상/플레이리스트/스케줄/TV재생 | StoreSignagePage | FULL (3탭) |
| GP | 동영상/플레이리스트/스케줄/TV재생 | StoreSignageMainPage | FULL (3탭 + 강제콘텐츠 경고) |
| KC | 플레이리스트(+player) | StoreSignagePage | FUNCTIONAL (동영상/스케줄 탭 라우트만, 화면 없음) |

---

## 6. Product/Trade Flow Findings

- **KPA** — `상품`(PharmacyB2BPage)은 getListings+getCatalog 병합, 도메인 탭(일반/이벤트/혈당/화장품), 선택+수량→주문 작업대 담기까지 FUNCTIONAL. **이벤트 상품 개념 존재**(kpa-groupbuy). 거래 신청 전용 화면은 없고 작업대(order-worktable)로 우회. 주문 관리 FUNCTIONAL(KPI+상태탭+상세). 매출/정산은 상품·거래 밖.
- **GlycoPharm** — 3단계(상품→거래신청→주문)를 설계했으나 **`상품`(/management/b2b PharmacyB2BProducts)이 "검증용 placeholder"로 B2B API 미연결**(일반 상품 API 임시 대체). `거래 신청`(/b2b-order)은 프랜차이즈/일반 탭+취급요청까지 FUNCTIONAL. 주문 관리 FUNCTIONAL(채널 표시 포함).
  - ⚠️ V2에서 GP `상품` 메뉴를 `/management/b2b`로 연결했는데, 그 화면이 placeholder 임 → §12 RISK.
- **K-Cosmetics** — 상품·거래 그룹은 **주문 관리만**. 공급자 상품/거래 신청 컴포넌트 자체가 코드에 없음(Neture 플랫폼 의존 구조). 주문 관리 FUNCTIONAL(B2B/B2C 통합). 매출 요약은 분석 영역(StoreRevenueSummaryPage).

---

## 7. Product-Based Activation Findings

- **3개 서비스 모두 5개 메뉴(제품/상품설명/POP/QR/블로그) 라우트·컴포넌트 존재.** 공통 패키지 `@o4o/store-ui-core` 의 `StartProductionModal` / `buildProductionState` / `composeSourceTextFromItems` 를 공유하여 제작 진입 흐름이 표준화됨. 서비스별로 production targets/templates config 만 다름.
- **성숙도: KPA(FULL) > GlycoPharm ≈ K-Cosmetics(FUNCTIONAL).** KPA 만 보유한 고급 기능:
  - POP: 다중 origin(library/snapshot/direct), PDF 출력, scan analytics
  - QR: AI 제목 생성(AiContentModal), device/scan 통계, 선택 일괄 A4 PDF
  - 블로그: ActionBar 일괄 발행/보관/삭제
  - 제품 row action: `StoreLocalProductsPage` 행에 `마케팅 자산(/commerce/products/{id}/marketing)`·`POP 만들기(/commerce/products/{id}/pop)` 진입 — GP/KC 동일 구조 추정이나 미실증.
- **진입 UX 불일치:** 상품설명/POP 는 "새로 만들기" 버튼 제거(자료함/제품 진입 일원화)인데, KC QR 은 화면 내 생성 버튼 잔존.
- **상태 필터:** 블로그만 보유. POP/QR/상품설명은 상태 탭 없음.

---

## 8. Library Findings

- **구조:** 경로(`/library/contents|resources|production-materials`)는 공통이나 **구현은 서비스별 개별 + Phase 격차**.
  - KPA: `자료` 2-source 통합(직접 등록 store_execution_assets + 가져온 o4o_asset_snapshots) + 출처 배지(library/snapshot) + 등록/삭제/상세 Drawer. `제작 자료`는 POP+QR(store_qr_codes)+블로그(store_blog_posts) **3종 결과물 통합** + **derivation viewer(원본 보기)**.
  - GP/KC: `자료`는 store_library_items read-only(Phase 2-B), `제작 자료`는 generated assets 만(Phase 2-D) — QR/블로그 미통합, derivation 없음.
- **store_asset_derivations(원본→파생 추적):** **백엔드 FULL**(테이블+서비스+`GET /api/v1/kpa/store/asset-derivations`, 다형관계·org/service 격리), **프론트는 KPA만**(`storeAssetDerivations.ts` + StoreProductionMaterialsPage 모달). **GP/KC 프론트 MISSING이나 백엔드 인프라는 재사용 가능**(최근 커밋 966062aa1/9632554a0).
- **출처/용도 필터:** KPA 자료/제작자료에 출처·용도 표시. GP/KC 는 category/usageType 라벨 정도.

---

## 9. Digital Signage Findings

- **공통 엔티티(`packages/digital-signage-core`)는 product 관계 없음**(SignageMedia/Playlist/PlaylistItem) — 정상.
- **KPA/GP: 동영상 URL / 플레이리스트 / 스케줄(방영) 3탭 FULL.** 매장 허브 복사는 `assetSnapshotApi.copy` 지원(GP는 "Library에서 선택" UI). 커뮤니티 동영상/플레이리스트 가져오기는 미구현.
- **K-Cosmetics: 플레이리스트만 FUNCTIONAL.** 동영상/스케줄 탭은 라우트만 있고 화면 없음. 단, `?mediaId=` 쿼리로 커뮤니티 사이니지 자동 적용은 부분 지원.
- 제품 목록/상세 row action 에 "사이니지 만들기" 노출 **없음**(3개 서비스 모두) — 분리 원칙 정합.

---

## 10. Cross-Service Gaps

| 갭 | KPA | GP | KC | 비고 |
|---|---|---|---|---|
| 상품(거래 대상) 화면 | FUNCTIONAL | PLACEHOLDER | MISSING | GP 백엔드 미연결, KC 부재 |
| 거래 신청 전용 화면 | 우회(작업대) | FUNCTIONAL | MISSING | 서비스별 흐름 상이 |
| 자료함 `자료` 등록/삭제 | FULL | PARTIAL | PARTIAL | GP/KC Phase 2-B 미완 |
| 자료함 `제작 자료` 결과물 통합(QR/블로그) | FULL | MISSING | MISSING | GP/KC Phase 2-D 미완 |
| derivation viewer(프론트) | FULL | MISSING | MISSING | 백엔드는 공통 가능 |
| 사이니지 동영상/스케줄 탭 | FULL | FULL | MISSING(화면) | KC 탭 미구현 |
| 제품 row action 콘텐츠 진입 | 실증 FULL | 미실증 | 미실증 | GP/KC 검증 필요 |
| 진입 UX(새로 만들기 버튼) | 제거 일원화 | 제거 | QR 버튼 잔존 | 불일치 |
| 분석 `상품 성과`/`콘텐츠·채널 성과` | MISSING | MISSING | MISSING | 라우트·메뉴 부재(트리 기대치와 갭) |
| `노출 설정` | MISSING | MISSING | MISSING | 라우트 부재 |

---

## 11. Reuse Opportunities

- **`@o4o/store-ui-core` 제작 흐름(StartProductionModal/buildProductionState)** — 이미 3개 서비스 공유. 확장 시 추가 비용 낮음.
- **store_asset_derivations 백엔드** — KPA 전용이 아니라 org/service 격리 다형 구조라 GP/KC 프론트만 붙이면 됨.
- **KPA `StoreLibraryResourcesPage`(2-source 통합) / `StoreProductionMaterialsPage`(결과물 통합)** — GP/KC Phase 2-B/2-D 완성 시 KPA 구현을 공통 패키지로 승격 가능.
- **KPA POP/QR/블로그 고급 기능(AI/PDF/analytics/batch)** — 서비스별 재구현이 아니라 공통화 후보.

---

## 12. Risks

| # | Risk | 등급 | 근거 |
|---|---|---|---|
| R1 | **K-Cosmetics 사이니지 ↔ product 직접 관계** — `PlaylistItem.type='product'` + `productId`, `CosmeticsCampaign.products` + `signagePlaylistId`. "signage product relation 금지" 원칙 위반 | **HIGH** | `packages/dropshipping-cosmetics/src/backend/entities/signage-playlist.entity.ts:11-14`, `campaign.entity.ts:33-37` |
| R2 | **GlycoPharm `상품`(/management/b2b) PLACEHOLDER** — V2 메뉴가 백엔드 미연결 화면으로 연결됨. 사용자가 빈/임시 데이터를 봄 | MED | `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx:142-153` |
| R3 | 자료함 GP/KC Phase 2-B/2-D 미완 — 제작 결과물(QR/블로그)이 자료함에서 조회 안 됨(파편화) | MED | StoreProductionMaterialsPage(GP/KC) generated only |
| R4 | 분석 `상품 성과`/`콘텐츠·채널 성과`, `노출 설정` 라우트 부재 — 트리 기대치와 실제 갭 | LOW | storeMenuConfig 미포함, route 없음 |
| R5 | 제품 row action(콘텐츠 진입)이 KPA만 실증 — GP/KC 미검증 | LOW | StoreLocalProductsPage 행 액션(KPA) |

> 본 IR 은 기록만. R1~R5 수정은 후속 WO.

---

## 13. Recommended WO Sequence

우선순위(영향도·리스크 기준):

| 순위 | WO 후보 | 목적 | 대상 | 재사용/신규 | 위험도 | 선행 |
|---|---|---|---|---|---|---|
| 1 | `WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMEDIATION-V1` | R1 — KC signage product 관계 정리(분리 원칙 복원) | KC | 신규 판단 필요 | HIGH | 별도 설계 IR 권장 |
| 2 | `WO-O4O-GLYCOPHARM-B2B-PRODUCTS-BACKEND-WIRING-V1` | R2 — GP 상품(/management/b2b) 실데이터 연결 또는 메뉴 재지정 | GP | 일부 신규(API) | MED | 백엔드 B2B API |
| 3 | `WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-COMPLETE-V1` | 자료함 GP/KC 자료 등록/삭제 + 제작 결과물 통합(QR/블로그) | GP/KC | KPA 재사용 | MED | KPA 구현 승격 |
| 4 | `WO-O4O-STORE-ACTIVATION-PRODUCT-ROW-ACTIONS-V1` | 제품 row action(상품설명/POP/QR/블로그/활용자료) GP/KC 검증·통일 | GP/KC | KPA 재사용 | LOW | — |
| 5 | `WO-O4O-STORE-ASSET-DERIVATION-FRONTEND-CROSSSERVICE-V1` | derivation viewer GP/KC 확장(백엔드 공통) | GP/KC | 백엔드 재사용 | LOW | Phase2 완료 |
| 6 | `WO-O4O-COSMETICS-SIGNAGE-VIDEO-SCHEDULE-TABS-V1` | KC 사이니지 동영상/스케줄 탭 구현(KPA/GP 정합) | KC | KPA/GP 재사용 | MED | R1 정리 후 |
| 7 | `WO-O4O-STORE-CREATION-ENTRY-UX-CONSISTENCY-V1` | 진입 UX 통일(KC QR 생성 버튼 등 정합) | KC(주) | 정리 | LOW | — |
| 8 | `WO-O4O-STORE-TRADE-APPLICATION-FLOW-CONSOLIDATION-V1` | 거래 신청 흐름 서비스 간 정합(KPA 우회 vs GP 전용) | KPA/GP | 정리 | MED | — |
| (보류) | `WO-O4O-STORE-PRODUCT-LIST-INTERNAL-TABS-BADGES-V1` | 상품 화면 내부 탭/배지(이벤트/거래가능/공급자별) | 3서비스 | 신규 UX | LOW | 상품 화면 성숙 후 |
| (보류) | `WO-O4O-STORE-ANALYTICS-PERFORMANCE-VIEWS-V1` | 분석 상품 성과/콘텐츠·채널 성과 신설 | 3서비스 | 신규 | LOW | 별도 결정 |

권장 진행: **R1(사이니지 product 관계) 설계 판단 → R2(GP 상품) → 자료함 Phase2 완료(KPA 승격) → row action/derivation 공통화 → KC 사이니지 탭.**

---

## 14. Out of Scope

본 IR 은 조사 전용. 코드 수정 / DB migration / 신규 API / 신규 화면 / 메뉴 라벨·재배치 / 제품 row action 구현 / 자료함 탭 구현 / 거래 신청 통합 구현 / 사이니지 구조 변경 / core·extension contract 변경 / 배포 **없음**.

---

## 15. Evidence

- 메뉴: `packages/store-ui-core/src/config/storeMenuConfig.ts`, `menuCapabilityMap.ts`
- 상품·거래: `web-kpa-society/.../PharmacyB2BPage.tsx`, `StoreOrdersPage.tsx` · `web-glycopharm/.../PharmacyB2BProducts.tsx`(L142-153 placeholder), `b2b-order/B2BOrderPage.tsx`, `PharmacyOrders.tsx` · `web-k-cosmetics/.../store/StoreOrdersPage.tsx`
- 활성화: `StoreProductsManagerPage`(@o4o/store-products-ui), 각 서비스 `StoreProductDescriptionsPage`/`StorePopPage`/`StoreQ(R/r)Page`/`PharmacyBlogPage`·`StoreBlogManagePage`; KPA `StoreLocalProductsPage.tsx:261-273`(row action)
- 자료함: 각 서비스 `StoreLibrary(Contents|Resources)Page.tsx`, `StoreProductionMaterialsPage.tsx`; KPA `api/storeAssetDerivations.ts`; backend `store_asset_derivations`(GET /api/v1/kpa/store/asset-derivations)
- 사이니지: `digital-signage-core/.../SignageMedia|SignagePlaylist|SignagePlaylistItem.entity.ts`; KPA `StoreSignagePage.tsx`, GP `signage/StoreSignageMainPage.tsx`, KC `store/StoreSignagePage.tsx`; **RISK** `dropshipping-cosmetics/.../signage-playlist.entity.ts:11-14`, `campaign.entity.ts:33-37`

---

**작성:** O4O Platform Team · 2026-06-05
**상태:** Complete — 후속 WO 후보 §13 참조
