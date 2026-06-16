# CHECK-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-FRONTEND-ADAPTER-V1

> WO: `WO-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-FRONTEND-ADAPTER-V1`
> 선행 IR: `docs/investigations/IR-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-DATA-SOURCE-ALIGNMENT-V1.md` (판정 A. READY)
> 작성일: 2026-06-16

---

## 1. Summary

GlycoPharm 내 약국 `상품·거래 > 상품` 화면(`/store/management/b2b`)을 레거시 자체상품 목록에서 공통 공급상품 카탈로그 화면으로 전환했다. `PharmacyB2BProducts.tsx`를 `@o4o/store-ui-core` `SupplyCatalogHub` thin wrapper로 교체하고, 기존 GlycoPharm 카탈로그 API(`pharmacyProducts`: `getCatalog`/`applyBySupplyProductId`/`cancelProductByOfferId`)를 재사용했다.

- 신규 backend/route/DB/seed/migration **0** (선행 IR: 공통 route·API client 이미 존재)
- 레거시 `glycopharm_products` 체계(엔티티/API/`pharmacyApi.getProducts`) **제거하지 않음** — admin·`/b2b-order`·storefront·파트너모집이 계속 소비
- K-Cosmetics `StoreCommerceProductsPage`와 동형 패턴 (accent만 teal, tableId·heading 분리)

---

## 2. Scope

- 대상: GlycoPharm 단독, 화면 컴포넌트 1개 교체 + CHECK 문서
- 한다: `PharmacyB2BProducts.tsx` → SupplyCatalogHub wrapper, 기존 GP catalog API 재사용, typecheck, CHECK
- 하지 않는다: backend/route/DB/seed/migration, 공통 컴포넌트 수정, 레거시 제거, `/b2b-order`/admin/storefront/recruitment 변경, KPA/KC 화면 변경, storeMenuConfig/menuCapabilityMap 변경, route path 표준화, OrderType/checkout-cart 변경

---

## 3. Changed Files

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx` | 레거시 DataTable(`pharmacyApi.getProducts`) 구현 전체 → `SupplyCatalogHub` thin wrapper(accent teal, tableId `glycopharm-store-commerce-products`, heading 주입, GP catalog API). default export 유지 |
| `docs/investigations/CHECK-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-FRONTEND-ADAPTER-V1.md` | 본 CHECK 문서(신규) |

> storeMenuConfig, menuCapabilityMap, SupplyCatalogHub, KPA/KC 화면, glycopharm_products backend/entity/API, `/b2b-order`, admin, storefront, partner recruitment, OrderType, checkout/cart, Home/Hero/Header 미접촉.

---

## 4. Before / After

```
Before:
  화면 = 약국 자체 관리 상품 목록 (glycopharm_products, pharmacy_id-scoped)
  API  = pharmacyApi.getProducts() → GET /glycopharm/pharmacy/products
  컬럼 = 이미지/상품명/공급자/카테고리/가격/재고/상태/액션(보기·편집 stub)
  액션 = 보기/편집 (console.log stub, 거래 미연결)

After:
  화면 = 공급자 공급상품 카탈로그 + 내 약국 추가/제외
  API  = getCatalog/applyBySupplyProductId/cancelProductByOfferId
         → GET /glycopharm/pharmacy/products/catalog (공통 컨트롤러, serviceKey='glycopharm')
  컬럼 = 상품명(+취급 배지)/공급자/공급가/액션 (SupplyCatalogHub 표준)
  액션 = 내 약국에 추가(apply)/제외(cancel) — 실기능
  제목 = "상품 관리"
  설명 = "약국에서 거래할 공급자 상품을 확인하고 내 약국에 추가할 수 있습니다."
```

**의미 전환:** 화면이 보여주는 상품이 *약국 자체 등록 상품* → *공급자 공급상품 카탈로그*로 바뀜. (canonical "상품·거래 > 상품 = 거래 대상 공급 상품" 정합)

---

## 5. API/Data Source

- 재사용 API: `services/web-glycopharm/src/api/pharmacyProducts.ts` (변경 없음)
  - `getCatalog()` → `GET /glycopharm/pharmacy/products/catalog` (`service_key=glycopharm`)
  - `applyBySupplyProductId()` → `POST /glycopharm/pharmacy/products/apply` (= 공급 상품 신청, ProductApproval PENDING. 신청 ≠ 주문)
  - `cancelProductByOfferId()` → `DELETE /glycopharm/pharmacy/products/by-offer/:offerId`
- backend: 공통 `createPharmacyProductsController(..., 'glycopharm')`(`glycopharm.routes.ts:381`) — **이미 mount, 무변경**
- 데이터: 공통 `SupplierProductOffer`⊕`ProductMaster` 카탈로그. 신규 endpoint/DB 0.

---

## 6. Legacy GlycopharmProduct Boundary

이번 전환에서 레거시 자체상품 체계는 제거하지 않음:

| 항목 | 상태 |
|---|---|
| `GlycopharmProduct` 엔티티 / `glycopharm_products` 테이블 | 존치 |
| `GET /glycopharm/pharmacy/products` (`createPharmacyController`) | 존치 |
| `pharmacyApi.getProducts()` (`src/api/pharmacy.ts`) | 존치 (이 화면에서만 미사용) |
| `/store/b2b-order` (`B2BOrderPage`, `/b2b/products`) | 무변경 |
| Admin 상품 관리 / storefront / 파트너 모집 | 무변경 |

→ 본 WO는 **내 약국 "상품" 화면 1개만** 카탈로그로 전환. 레거시 소비처 전부 영향 없음.

---

## 7. Store HUB Relationship

- `/store-hub/b2b`(`HubB2BCatalogPage`) 무변경. 동일 `SupplyCatalogHub` + GP `getCatalog` 사용.
- IA 구분 유지:
  - `/store/management/b2b` = 내 약국 상품·거래 업무 화면 (제목 "상품 관리", tableId `glycopharm-store-commerce-products`)
  - `/store-hub/b2b` = Store HUB 탐색 화면 (기본 제목 "상품 카탈로그", tableId `glyco-store-hub-b2b-products`)
- tableId 분리로 컬럼 폭 등 로컬 상태 독립. heading 분리로 화면 정체성 구분.

---

## 8. TypeScript Result

```
cd services/web-glycopharm && npx tsc --noEmit -p tsconfig.json
WEB-GLYCOPHARM EXIT: 0
```

- 결과: PASS. 공통 컴포넌트 미수정으로 store-ui-core/web-k-cosmetics typecheck 불요.
- `CatalogProduct`가 `SupplyCatalogProduct` 제약 충족(id/name/description?/supplierName?/priceGeneral?/priceGold?/isAdded?) — KC와 동일 패턴.

---

## 9. Browser Smoke Result

- 상태: **배포 후 수행 예정 (PENDING)**
- 확인 항목:
  1. `/store/management/b2b` 진입 → 제목 "상품 관리"
  2. 설명에 공급자 상품/내 약국 추가 흐름 표시
  3. 공급상품 카탈로그 또는 empty state 정상
  4. 내 약국에 추가(apply)/제외(cancel) 동작
  5. `/store-hub/b2b` 기존 화면 정상(기본 제목 유지)
  6. `/store/b2b-order` 거래 신청 화면 정상
  7. 사이드바 `약국 상품·거래 > 상품` active 정상
  8. console critical error 없음
- 활성 supplier offer 데이터가 없으면 empty state까지만 확인(IR §9 실측 권장 사항).

---

## 10. Regression Check

- App.tsx `management/b2b` route → `PharmacyB2BProducts` default lazy import 유지(유일 importer). export 형태 동일 → route 무영향.
- 레거시 import(`@o4o/ui` DataTable, `@/api/pharmacy` getProducts, lucide 아이콘) 제거 — 이 파일 한정. `pharmacyApi.getProducts` 자체는 존치.
- 공통 `SupplyCatalogHub` 무변경 → GP HUB/KC 소비처 무영향.
- typecheck PASS로 깨진 참조 없음 확인.

---

## 11. Follow-ups

- 배포 후 browser smoke 수행 및 본 문서 §9 갱신
- 활성 supplier offer 건수 read-only 실측(IR §9) — 빈 화면 여부 사전 확인
- `WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1` — KPA/GP/KC route(`/management/b2b` vs `/commerce/products`)·탭·컬럼·설명 표준 정렬
- (선택) `WO-O4O-GLYCOPHARM-SELF-PRODUCT-RELOCATION-V1` — 레거시 자체상품 화면을 "자체 상품/활성화 축"으로 명시 이관(필요 시)
