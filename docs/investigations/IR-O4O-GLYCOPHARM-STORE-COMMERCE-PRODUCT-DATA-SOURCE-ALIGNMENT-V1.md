# IR-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-DATA-SOURCE-ALIGNMENT-V1

> 조사 전용 IR. 코드/DB/route/UI **무변경**.
> **판정: A. READY** — 공통 상품 도메인 backend route + GP 카탈로그 API client 가 **이미 존재**. 내 약국 "상품" 화면 컴포넌트 1개의 frontend 교체만으로 전환 가능(K-Cosmetics INTRODUCE 와 동형).
> 선행: [`IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1`](IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1.md) · [`CHECK-…-GLYCOPHARM-…-PRODUCTIONIZE-V1`](CHECK-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-PAGE-PRODUCTIONIZE-V1.md) · [`CHECK-…-KCOSMETICS-…-INTRODUCE-V1`](CHECK-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1.md)
> 작성일: 2026-06-16

---

## 1. Summary

선행 IR 은 "GP 상품 화면만 레거시 `glycopharm_products` 기반"이라 판정했다. 본 IR 의 정밀 추적 결과, **공통 상품 도메인 전환을 위한 인프라는 GP 에 이미 대부분 구축되어 있다.**

| 자산 | 상태 | 근거 |
|------|:--:|------|
| 공통 backend 컨트롤러 (`createPharmacyProductsController(..., 'glycopharm')`) | **이미 mount** | `glycopharm.routes.ts:381` |
| `serviceKey='glycopharm'` 화이트리스트 | **등록됨** | `constants/service-keys.ts:16` (`GLYCOPHARM:'glycopharm'`) |
| GP 카탈로그 API client (`getCatalog`/`apply`/`cancel` + `CatalogProduct`) | **이미 존재** | `services/web-glycopharm/src/api/pharmacyProducts.ts:17-102` |
| 공통 카탈로그 UI 컴포넌트 (`SupplyCatalogHub`) | **GP 가 이미 사용 중**(HUB) | `services/web-glycopharm/src/pages/hub/HubB2BCatalogPage.tsx:24-33` |
| 레거시에 남은 것 | **화면 컴포넌트 1개** | `PharmacyB2BProducts.tsx` 가 `pharmacyApi.getProducts()`(legacy) 사용 |

**핵심 결론:**
1. **판정 A (READY).** 내 약국 `/store/management/b2b` 화면(`PharmacyB2BProducts.tsx`)을 **K-Cosmetics `StoreCommerceProductsPage` 와 동일하게 `SupplyCatalogHub` 래퍼로 교체**하면 공통 도메인으로 전환된다. backend route 추가·DB migration·data seed **불요**.
2. **단, 이는 "데이터 소스 교체"가 아니라 "상품 우주 교체"다.** 레거시 화면은 *약국 자체 관리 상품*(`glycopharm_products`, pharmacy_id-scoped CRUD)을 보여주고, 공통 카탈로그는 *공급자 공급 상품 신청*(`supplier_product_offers`)을 보여준다. 두 우주는 의미가 다르다 → §11 의사결정 필요.
3. **레거시 `glycopharm_products` 는 제거 대상이 아니다.** admin 상품관리·`/b2b-order`·소비자 storefront·파트너 모집이 여전히 소비 → 화면 1개만 전환, 테이블/레거시 API 존치.

---

## 2. Scope

대상: GlycoPharm 내 약국 `상품·거래 > 상품`(`/store/management/b2b` → `PharmacyB2BProducts.tsx`)의 데이터 소스 전환 가능성.
비교: KPA `PharmacyB2BPage` · K-Cosmetics `StoreCommerceProductsPage` · 공통 `SupplyCatalogHub` · 공통 backend `createPharmacyProductsController`.
제외: 코드/route/DB/seed/UI 변경, KPA/KC 화면 변경, 배포.

---

## 3. Background

`WO-O4O-GLYCOPHARM-…-PRODUCTIONIZE-V1`(commit `38fc07e72`)로 GP 상품 화면의 검증용 문구는 제거됐으나 데이터 소스는 레거시로 유지됐다. 선행 cross-service IR 은 GP 를 데이터 소스 분기(공통 vs 레거시) 지점으로 식별했고, 후속 P3 으로 본 정렬 조사를 지정했다. K-Cosmetics 는 `…-INTRODUCE-V1`(commit `bc69f00e2`)로 공통 카탈로그(`SupplyCatalogHub`) 기반 상품 화면을 이미 도입했다 — 본 IR 의 직접 선례.

---

## 4. Current GlycoPharm Product Flow (레거시)

화면 `PharmacyB2BProducts.tsx` → `pharmacyApi.getProducts()` (`services/web-glycopharm/src/api/pharmacy.ts:416-432`) → `GET /glycopharm/pharmacy/products` → `createPharmacyController`(`routes/glycopharm/controllers/pharmacy.controller.ts:47-129`) → `GlycopharmProduct`(`glycopharm_products`).

- 쿼리: `WHERE product.pharmacy_id = :pharmacyId ORDER BY created_at DESC` (약국별 자체 상품 CRUD).
- 응답 `PharmacyProduct`(pharmacy.ts:106-120): `name/categoryName/price/salePrice/stock/status/thumbnailUrl/supplierName/...`.
- **성격:** 약국이 직접 등록·관리하는 상품 목록. 화면 액션은 "보기/편집"(console.log stub)뿐 — **주문/거래신청 미연결**. 실거래는 `checkout_orders` 별도.
- 레거시 별도 B2B: `GET /glycopharm/b2b/products?type=franchise|general`(`pharmacy.controller.ts` `createB2BController`)도 동일 `glycopharm_products`(`is_featured`=franchise) 소비 → `/store/b2b-order`(`B2BOrderPage`, 장바구니 UI). 메뉴 "거래 신청" = `/b2b-order`(별도, 본 전환 대상 아님).

### `glycopharm_products` 소비처 전수 (제거 불가 근거)
| 소비처 | 위치 | 비고 |
|------|------|------|
| 내 약국 상품 화면 | `PharmacyB2BProducts.tsx` | **본 전환 대상** |
| B2B 주문 화면 | `B2BOrderPage.tsx`(`/b2b/products`) | franchise/general, 별도 유지 |
| Admin 상품 관리 | `admin-dashboard/products/ProductListPage.tsx` | CRUD, 유지 |
| 소비자 storefront | `glycopharm/controllers/store.controller.ts` | visibility-gated 노출, 유지 |
| 파트너 모집 | `is_partner_recruiting` 플래그 | Neture 제휴, 유지 |
| catalog/store bridge | `20260409300000-MigrateGlycopharmProductsToCatalogAndStore` | 원본 보존 |

---

## 5. KPA/K-Cosmetics Common Product Flow

공통 컨트롤러 `createPharmacyProductsController(ds, auth, serviceKey?)` (`routes/o4o-store/controllers/pharmacy-products.controller.ts:46-53`). 엔드포인트: `GET /catalog`(70), `POST /apply`(195), `GET /applications`(241)/`/approved`(294)/`/listings`(326), `PUT /listings/:id`(351) + channels, `DELETE /by-offer/:offerId`(523).

- catalog SQL(106-145): `supplier_product_offers spo JOIN product_masters pm JOIN neture_suppliers s` — `distribution_type IN ('PUBLIC','SERVICE','PRIVATE') AND spo.is_active`. **catalog 자체는 serviceKey 미필터(전 공급 풀)**, `isAdded`/listings/approvals 는 `organization_id`+`service_key` scoped.
- serviceKey 검증: `VALID_SERVICE_KEYS = Object.values(SERVICE_KEYS)` (controller:30). `'glycopharm'` 등록됨(`service-keys.ts:16`). role 격리: `glycopharm:store_owner`(`store-owner.utils.ts`).
- KPA 등록 `kpa.routes.ts:374`(`'kpa'`) · KC `cosmetics.routes.ts:133`(`'cosmetics'`) · **GP `glycopharm.routes.ts:381`(`'glycopharm'`) — 이미 mount됨.**

프론트:
- KPA `PharmacyB2BPage` = `getListings()`⊕`getCatalog()` 병합 + 도메인 탭 5개 + 작업대 흐름(독자 구현).
- KC `StoreCommerceProductsPage` = `SupplyCatalogHub` thin wrapper(`getCatalog`/`apply`/`cancel`, accent pink, heading 주입).
- **GP `HubB2BCatalogPage`(HUB) = 이미 `SupplyCatalogHub` thin wrapper(accent teal)** — 동일 GP `getCatalog`.

---

## 6. Current Data Source Matrix

| Service | Product page | Frontend API | Backend route | Entity/table | Trade-ready? | Notes |
|---|---|---|---|---|:--:|---|
| KPA | `/store/commerce/products` | `getListings`+`getCatalog` | `/kpa/pharmacy/products/*` | `OrganizationProductListing`⊕`SupplierProductOffer` | YES | 병합+작업대 |
| GlycoPharm (현재) | `/store/management/b2b` | `pharmacyApi.getProducts()` | `/glycopharm/pharmacy/products` | **`glycopharm_products`(레거시)** | NO | 약국 자체 CRUD, 액션 stub |
| GlycoPharm (가용) | (전환 시) | **`getCatalog`(이미 존재)** | **`/glycopharm/pharmacy/products/catalog`(이미 mount)** | `SupplierProductOffer`⊕`ProductMaster` | YES | HUB 가 이미 사용 |
| K-Cosmetics | `/store/commerce/products` | `getCatalog` | `/cosmetics/pharmacy/products/catalog` | `SupplierProductOffer` | YES | `SupplyCatalogHub` |

---

## 7. Field Mapping Matrix

전환을 `SupplyCatalogHub` 채택(KC 방식)으로 하면 화면이 `CatalogProduct` shape 를 그대로 소비 → **adapter 불요**. 레거시 컬럼 일부는 카탈로그에 없음(축소).

| UI field (레거시 GP) | Legacy source (`glycopharm_products`) | Common domain (`CatalogProduct`/SupplyCatalogHub) | Mapping | Notes |
|---|---|---|---|---|
| 상품명 | `name` | `name` | Low | 동일 |
| 공급자 | `supplierName`(=manufacturer) | `supplierName`(neture_suppliers) | Low | 의미 약간 다름(제조사 vs 공급사) |
| 카테고리 | `categoryName` | `category`(brand_name) | Low | HUB 동일 |
| 가격 | `price`/`salePrice` | `priceGold ?? priceGeneral` | Low | HUB 동일 |
| 재고 | `stock` | **없음** | — | SupplyCatalogHub 미표시(KC/HUB 동일) |
| 상태 | `status`(active/…) | `isAdded`(취급 여부) | Medium | 의미 전환(상품상태→취급여부) |
| 이미지 | `thumbnailUrl` | **없음** | — | SupplyCatalogHub 미표시 |
| 액션 | 보기/편집(stub) | 추가/제외(apply/cancel) | — | stub→실기능 |

→ 카탈로그 채택 시 재고/이미지/상태 컬럼은 사라지나 KC·GP-HUB 와 동일한 운영 패턴. (검색은 SupplyCatalogHub 미내장 — 유통유형 탭으로 대체.)

---

## 8. Route/API Gap Matrix

| Need | Existing GP legacy | Existing common (GP) | Gap | Recommendation |
|---|---|---|:--:|---|
| catalog list | `/glycopharm/pharmacy/products`(자체상품) | **`/glycopharm/pharmacy/products/catalog`(이미 mount)** | **없음** | 화면을 catalog API 로 전환 |
| listings | — | `/glycopharm/pharmacy/products/listings`(이미 존재) | 없음 | 필요 시 KPA식 병합 가능 |
| apply/cancel | — | `apply`/`by-offer/:offerId`(이미 존재) | 없음 | SupplyCatalogHub 가 사용 |
| 거래신청/주문 | `/b2b-order`(franchise/general) | (별도) | n/a | 본 전환 범위 외, 유지 |

→ **backend gap 0.** 전환은 순수 frontend.

---

## 9. Migration / Compatibility Matrix

| Data area | Map to common? | Migration needed? | Risk | Notes |
|---|:--:|:--:|---|---|
| 화면 표시 상품 우주 | n/a | **NO** | 중 | catalog 는 공급자 offer 풀(전 서비스 공유, serviceKey 미필터). GP 자체 `glycopharm_products` 와 **다른 우주** |
| Supplier offer 데이터 | 공유 풀 사용 | NO | 하 | 신규 seed 불요 — 기존 활성 offer 표시 |
| Stock/status | 미표시 | NO | 하 | 카탈로그 비표시(KC 동일) |
| 기존 order 참조 | 무관 | NO | 하 | 주문은 `checkout_orders`, 본 화면 미연결 |
| 레거시 admin/b2b-order/storefront | 유지 | NO | 하 | `glycopharm_products` 존치 — 제거 금지 |

→ **DB migration·seed 0.** row-level 데이터 분포(현재 활성 supplier offer 수)는 read-only 실측 권장(아래).

> **DB 실측 미수행(정적 확정):** prod DB 방화벽 + 비대화형 환경. 전환 WO 착수 시 read-only 로 확인 권장: ① `supplier_product_offers WHERE is_active` 건수(카탈로그가 빈 화면이 되지 않는지), ② GP 약국 organization 의 기존 `organization_product_listings`(service_key='glycopharm') 존재 여부.

---

## 10. Consumer Impact Matrix

| 소비처 | 현재 영향 | 후속 전환 영향 | 확인 항목 | 판정 |
|---|---|---|---|:--:|
| GlycoPharm | 직접 | 중 | `PharmacyB2BProducts.tsx` 교체, 화면 의미 전환(자체상품→공급카탈로그) | NOTE |
| KPA-Society | 없음 | 낮음 | 공통 컨트롤러 무변경(GP 는 frontend만) → 회귀 없음 | PASS |
| K-Cosmetics | 없음 | 낮음 | 공통 컨트롤러/`SupplyCatalogHub` 무변경 | PASS |
| Neture | 없음 | 낮음 | supplier offer 풀 공유(읽기) | PASS |
| API Server | 없음 | 없음 | route 이미 mount, 추가 변경 0 | PASS |
| Store UI Core | 없음 | 없음 | `SupplyCatalogHub` 재사용(무변경) | PASS |

> 전환 WO 가 frontend 화면 1개 교체로 한정되면 공통 backend/컴포넌트 무변경 → cross-service 회귀 위험 낮음.

---

## 11. Alignment Options

- **옵션 1 — SupplyCatalogHub 채택 (KC 동형, 권장).** `PharmacyB2BProducts.tsx` → `SupplyCatalogHub` thin wrapper(accent teal, 기존 GP `getCatalog`/`apply`/`cancel`, heading "상품 관리"). 재사용 자산 100%, backend 0. **HUB(`HubB2BCatalogPage`)와 동일 컴포넌트가 되어** IA 위치(내 약국 vs HUB)만 다른 점은 KC 선례(tableId·heading 분리)로 해소.
- **옵션 2 — KPA PharmacyB2BPage 식 병합(listings⊕catalog)+작업대.** 더 풍부(주문 작업대 연결)하나 독자 구현 이식 비용 큼. parity 단계에서 검토.
- **옵션 3 — 현행 유지(레거시 자체상품 화면).** 단 이는 canonical "상품·거래 > 상품 = 거래 대상 공급 상품" 의미와 어긋남(레거시는 자체 CRUD 성격). Drift 잔존.

**의사결정 포인트:** 내 약국 "상품" 화면이 보여줘야 할 것이 *공급자 거래 카탈로그*(canonical)인가, *약국 자체 관리 상품*(레거시)인가. canonical 정의상 전자 → **옵션 1 권장**. 후자 성격은 "자체 상품"/"내 약국 제품" 활성화 축에서 별도 처리(이미 메뉴 존재).

---

## 12. Risks

- **의미 전환 리스크(중):** 옵션 1 채택 시 화면이 *약국 자체 등록 상품* → *공급자 카탈로그 신청*으로 바뀐다. 기존 GP 약국이 자체 상품을 이 화면에서 봤다면 사용자 혼동 가능 → 전환 공지/문구 필요. 자체 상품 접근 경로(admin/자체상품) 존치 확인.
- **빈 화면 리스크(하):** 활성 supplier offer 가 적으면 카탈로그가 빈약. §9 실측으로 사전 확인.
- **HUB 중복 인상(하):** 내 약국 "상품"과 HUB "상품 카탈로그"가 동일 컴포넌트 → KC 처럼 heading/tableId 분리 + IA 안내로 구분.
- **검색 부재(하):** SupplyCatalogHub 는 텍스트 검색 미내장(유통유형 탭만). 레거시는 상품명 검색 보유 → 회귀 인지 필요.
- **route 비대칭(하):** GP 는 `/store/management/b2b`, KPA/KC 는 `/store/commerce/products`. parity 시 정렬 고려(별도).

---

## 13. Recommended WO Sequence

| 순위 | WO | 목적 | 위험 | 선행 |
|:--:|------|------|:--:|---|
| **1** | `WO-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-FRONTEND-ADAPTER-V1` | `PharmacyB2BProducts.tsx` → `SupplyCatalogHub` 래퍼(옵션 1, KC 동형). 기존 GP `getCatalog`/`apply`/`cancel` 재사용. backend 0 | 중(의미 전환) | 본 IR + §9 실측 |
| 2 | `WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1` | KPA/GP/KC 상품 화면 구조·컬럼·탭·route 표준 정렬 | 중 | WO 1, KC INTRODUCE |
| 3(선택) | `WO-O4O-GLYCOPHARM-SELF-PRODUCT-RELOCATION-V1` | 레거시 자체상품(`glycopharm_products`) 화면을 "자체 상품/활성화 축"으로 명시 이관(필요 시) | 하 | WO 1 |

> **READY 이므로 별도 route-enable WO(BACKEND_ROUTE_NEEDED)·seed/migration WO 불요.** WO 1 은 K-Cosmetics `…-INTRODUCE-V1` 과 거의 동일 패턴 — 차이는 GP 는 신규 도입이 아니라 레거시 화면 **교체**라는 점(의미 전환 공지 동반).

---

## 14. Out of Scope

코드/API/route/DB migration/seed/frontend 전환/GP·KPA·KC 화면 수정/storeMenuConfig/OrderType/checkout-cart/배포 **변경 0**. 본 IR 은 조사·판정·후속 WO 제안만 수행.

---

## 15. Evidence

- 공통 route mount(GP): `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts:381` (`createPharmacyProductsController(..., 'glycopharm')`) — **직접 확인**
- serviceKey 등록: `apps/api-server/src/constants/service-keys.ts:16` (`GLYCOPHARM:'glycopharm'`)
- 공통 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts:46-53`(factory), `:30`(VALID_SERVICE_KEYS), `:70-145`(catalog SQL)
- GP 카탈로그 API client: `services/web-glycopharm/src/api/pharmacyProducts.ts:17-102`(`CatalogProduct`/`getCatalog`/`apply`/`cancel`) — **직접 확인**, `:76` → `/glycopharm/pharmacy/products/catalog`
- GP HUB 가 SupplyCatalogHub 사용: `services/web-glycopharm/src/pages/hub/HubB2BCatalogPage.tsx:24-33`
- GP 레거시 화면/API/엔티티: `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx`, `src/api/pharmacy.ts:106-120,416-432`, `apps/api-server/src/routes/glycopharm/controllers/pharmacy.controller.ts:47-129`, `routes/glycopharm/entities/glycopharm-product.entity.ts`
- KC 선례: `services/web-k-cosmetics/src/pages/store/StoreCommerceProductsPage.tsx`, `src/api/pharmacyProducts.ts:15-81`
- 공통 컴포넌트: `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx:31-79`(props), `:255-333`(컬럼)
- 비교(KPA): `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx`, `src/api/pharmacyProducts.ts`

---

*Date: 2026-06-16 · GP 상품 화면 데이터 소스 정렬 조사 · 판정 A(READY) · 공통 backend route(glycopharm.routes:381)+GP catalog API client(pharmacyProducts.ts) 이미 존재, frontend 화면 1개 교체로 전환 가능(KC INTRODUCE 동형) · backend/seed/migration 0 · 단 "데이터 소스 교체"가 아닌 "상품 우주 전환"(자체상품→공급카탈로그) 의미 변화 동반 · 레거시 glycopharm_products 는 admin/b2b-order/storefront/recruitment 가 소비하므로 존치 · 후속 P1 frontend adapter(옵션 1).*
