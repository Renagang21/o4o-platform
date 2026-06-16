# CHECK-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1

> WO: `WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1`
> 선행: `IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1`, `CHECK-…-GLYCOPHARM-…-FRONTEND-ADAPTER-V1`, `CHECK-…-KCOSMETICS-…-INTRODUCE-V1`
> 작성일: 2026-06-16

---

## 1. Summary

KPA / GlycoPharm / K-Cosmetics 의 `상품·거래 > 상품` 화면을 cross-service 기준으로 정렬했다.

- **Route parity:** GlycoPharm 상품 화면을 canonical `/store/commerce/products` 로 정렬(KPA/KC 동형). legacy `/store/management/b2b` 는 redirect 로 보존(데드링크 0).
- **Copy parity:** 3서비스 제목 모두 "상품 관리". 설명을 "거래할 (공급자) 상품을 확인하고 …" 구조로 통일(KPA=약국+작업대, GP/KC=공급자 상품+추가).
- **구조 차이 유지:** KPA 는 listings⊕catalog 병합형(도메인 탭+작업대), GP/KC 는 `SupplyCatalogHub`형. 이번 WO 에서 구조 통일은 하지 않고 route·문구·역할만 정렬(WO §6.4).
- 신규 backend/API/DB/migration **0**. 공통 `SupplyCatalogHub` 컴포넌트 **무수정**(props/문구만).

---

## 2. Scope

- 대상: KPA/GP/KC 상품 화면 + GP route/menu canonical 정렬
- 한다: 제목/설명 정렬, GP route parity(+legacy redirect), GP/KC heading props 정렬, typecheck, CHECK
- 하지 않는다: backend/API/DB/seed/migration, 공통 컴포넌트 수정, KPA 구조→SupplyCatalogHub 전환, GP/KC→작업대 전환, glycopharm_products 제거, `/b2b-order`/admin/storefront/recruitment 변경, OrderType/checkout-cart, Store HUB 제거, Event Offer/공급자 별도 메뉴

---

## 3. Changed Files

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | GP `products` subPath `/management/b2b` → `/commerce/products` + 주석 갱신 |
| `services/web-glycopharm/src/App.tsx` | canonical `commerce/products` route 추가 + `management/b2b` → `/store/commerce/products` redirect |
| `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx` | 헤더 주석 route 참조 갱신(문구만) |
| `services/web-k-cosmetics/src/pages/store/StoreCommerceProductsPage.tsx` | 설명에 "공급자" 추가(용어 통일) |
| `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx` | 설명 정렬(약국+작업대 문구) |
| `docs/investigations/CHECK-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1.md` | 본 CHECK(신규) |

> `SupplyCatalogHub`, menuCapabilityMap, glycopharm_products backend/entity/API, `/b2b-order`, admin, storefront, recruitment, OrderType, checkout/cart, 디지털 사이니지, operator 페이지(다른 세션 WIP) 미접촉.

---

## 4. Before / After

```
Route (GlycoPharm):
  Before: 메뉴 subPath /management/b2b → /store/management/b2b (PharmacyB2BProducts)
  After:  메뉴 subPath /commerce/products → /store/commerce/products (PharmacyB2BProducts)
          /store/management/b2b → Navigate redirect (deep-link 보존)

Copy (3서비스):
  Before: KPA "매장에서 취급하는 상품을 서비스별로 탐색합니다"
          GP  "약국에서 거래할 공급자 상품을 확인하고 내 약국에 추가할 수 있습니다" (이미 정렬)
          KC  "매장에서 거래할 상품을 확인하고 내 매장에 추가할 수 있습니다"
  After:  KPA "약국에서 거래할 상품을 확인하고 주문 작업대에 담을 수 있습니다"
          GP  (동일 유지)
          KC  "매장에서 거래할 공급자 상품을 확인하고 내 매장에 추가할 수 있습니다"
  제목: 3서비스 모두 "상품 관리" (이미 일치)
```

---

## 5. Route/Menu Matrix

| Service | Menu group | Label | subPath | Canonical URL | Legacy URL | Component | 구조 |
|---|---|---|---|---|---|---|---|
| KPA | 약국 상품·거래 | 상품 | `/commerce/products` | `/store/commerce/products` | — | `PharmacyB2BPage` | listings⊕catalog + 도메인 탭 + 작업대 |
| GlycoPharm | 약국 상품·거래 | 상품 | `/commerce/products` | `/store/commerce/products` | `/store/management/b2b`(redirect) | `PharmacyB2BProducts` | SupplyCatalogHub |
| K-Cosmetics | 매장 상품·거래 | 상품 | `/commerce/products` | `/store/commerce/products` | — | `StoreCommerceProductsPage` | SupplyCatalogHub |

→ **3서비스 모두 canonical `/store/commerce/products` subPath 정렬 완료.** GP legacy deep-link 보존.

---

## 6. Copy Matrix

| Service | Title | Description |
|---|---|---|
| KPA | 상품 관리 | 약국에서 거래할 상품을 확인하고 주문 작업대에 담을 수 있습니다 |
| GlycoPharm | 상품 관리 | 약국에서 거래할 공급자 상품을 확인하고 내 약국에 추가할 수 있습니다 |
| K-Cosmetics | 상품 관리 | 매장에서 거래할 공급자 상품을 확인하고 내 매장에 추가할 수 있습니다 |

- 용어 통일: "거래할 (공급자) 상품" + "확인하고" + 서비스별 액션(작업대 담기 / 내 약국 추가 / 내 매장 추가).
- apply/cancel 은 "추가/제외"로 표기 — "주문/구매/결제" 오해 문구 없음(WO §9.4).
- 개발자/검증 용어(SupplierProductOffer/legacy/catalog API/adapter/검증) 미노출.

---

## 7. API/Data Source Matrix (변경 없음)

| Service | Frontend API | Backend route | Data source | 변경 |
|---|---|---|---|---|
| KPA | `getListings`+`getCatalog` | `/kpa/pharmacy/products/*` | `OrganizationProductListing`⊕`SupplierProductOffer` | 없음 |
| GlycoPharm | `getCatalog`/`apply`/`cancel` | `/glycopharm/pharmacy/products/catalog` | `SupplierProductOffer`⊕`ProductMaster` | 없음 |
| K-Cosmetics | `getCatalog`/`apply`/`cancel` | `/cosmetics/pharmacy/products/catalog` | `SupplierProductOffer`⊕`ProductMaster` | 없음 |

→ 본 WO 는 데이터 소스 무변경. route/문구 정렬만.

---

## 8. Consumer Impact Matrix

공통 모듈 `storeMenuConfig.ts`(GP 항목 subPath 변경) 수정 — `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 적용.

| 소비처 | 영향 | 변경 내용 | 검증 | 결과 |
|---|---|---|---|---|
| GlycoPharm | 있음 | products subPath → `/commerce/products`, route 추가 + legacy redirect, 설명 주석 | canonical route + redirect, typecheck PASS | PASS |
| K-Cosmetics | 있음(문구) | 설명에 "공급자" 추가. config 의 KC 블록 무변경 | typecheck PASS | PASS |
| KPA-Society | 있음(문구) | 설명 정렬. config 의 KPA 블록 무변경(이미 `/commerce/products`) | typecheck PASS | PASS |
| Neture | 없음 | 내 매장 상품 대상 아님. config Neture 블록 무변경 | — | PASS |
| StoreSidebar(공통) | 없음 | active 로직 무수정. `end`는 'management' 한정 — products 가 `/commerce/*`로 이동해 prefix 중복 위험 오히려 감소(KC 선례 동일) | 정적 확인 | PASS |

---

## 9. Store HUB Relationship

- GP/KC 의 `/store-hub/b2b`(`HubB2BCatalogPage`/`HubB2BPage`) 무변경.
- 내 매장 상품 화면 vs HUB 구분 유지(heading/tableId 분리):
  - GP: 내 약국 `glycopharm-store-commerce-products`("상품 관리") vs HUB `glyco-store-hub-b2b-products`("상품 카탈로그")
  - KC: 내 매장 `kcos-store-commerce-products`("상품 관리") vs HUB `kcos-store-hub-b2b-products`("상품 카탈로그")
- tableId 충돌 없음.

---

## 10. Regression Check

- GP route: `management/b2b` 가 redirect 로 바뀜 → 기존 deep-link 은 `/store/commerce/products`로 자동 이동. canonical route 가 `PharmacyB2BProducts` 렌더. `commerce/products/:productId/marketing|pop` 하위 route 와 충돌 없음(정확 경로 매칭).
- GP 사이드바: products subPath `/commerce/products` → active 정상(KC 선례 동일). 'management'(경영) 그룹은 `end` exact-match 유지 → 중복 하이라이트 없음.
- KPA/KC: 설명 문구만 변경 → 동작 회귀 없음. KPA 도메인 탭/작업대/판매 신청 흐름 무변경.
- 공통 `SupplyCatalogHub` 무수정 → GP HUB/KC HUB 소비처 무영향.
- 4개 패키지 typecheck PASS → 깨진 참조 없음.

---

## 11. TypeScript Result

```
packages/store-ui-core  → EXIT 0
services/web-glycopharm  → EXIT 0
services/web-k-cosmetics → EXIT 0
services/web-kpa-society → EXIT 0
```

모두 PASS.

---

## 12. Browser Smoke Result

- 상태: **배포 후 수행 예정 (PENDING)**
- KPA: `/store/commerce/products` 진입 → "상품 관리" + 새 설명, 도메인 탭/작업대 담기/Event Offer 탭 기존 동작 유지.
- GlycoPharm: 사이드바 "상품" 클릭 → `/store/commerce/products` 진입, "상품 관리" + 설명, 카탈로그/empty/apply/cancel 정상. `/store/management/b2b` 직접 접근 → redirect 확인. `/store-hub/b2b`·`/store/b2b-order` 정상.
- K-Cosmetics: `/store/commerce/products` 진입 → "상품 관리" + 새 설명, 카탈로그/apply/cancel 정상. `/store-hub/b2b`·주문 관리 정상.

---

## 13. Follow-ups

- 배포 후 browser smoke 수행 및 §12 갱신
- (선택) KPA 와 GP/KC 의 화면 구조 통일(listings⊕catalog+작업대 vs SupplyCatalogHub) — 대형 변경, 별도 WO 필요 시
- (선택) `WO-O4O-GLYCOPHARM-SELF-PRODUCT-RELOCATION-V1` — 레거시 자체상품 화면 활성화 축 이관
- 활성 supplier offer 건수 read-only 실측(빈 화면 여부)
