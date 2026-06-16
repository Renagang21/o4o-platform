# CHECK-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1

> WO: `WO-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1`
> 선행 IR: `docs/investigations/IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1.md` (KC 판정 F. MISSING)
> 작성일: 2026-06-16

---

## 1. Summary

K-Cosmetics 내 매장 `매장 상품·거래` 그룹에 `상품` 화면을 1차 도입했다. 신규 backend/DB 없이 기존 공통 카탈로그 컴포넌트(`@o4o/store-ui-core` `SupplyCatalogHub`)와 K-Cosmetics 상품 API(`pharmacyProducts`: `getCatalog`/`applyBySupplyProductId`/`cancelProductByOfferId`)를 재사용했다.

- 메뉴 `상품`(subPath `/commerce/products`)을 `주문 관리` 위에 추가
- route `/store/commerce/products` mount(데드링크 0 — 메뉴·route 동시 추가)
- 공통 컴포넌트에 **선택적(optional) 헤더 override prop**(`heading`)을 추가하여 내 매장 맥락 제목("상품 관리")을 주입. 기존 HUB 소비처(GP/KC)는 prop 미전달 → 기본 문구 유지(무영향)
- Store HUB(`/store-hub/b2b`) 및 주문 관리는 무변경

IR `F. MISSING` 격차를 해소했다.

---

## 2. Scope

- 대상: K-Cosmetics 단독 + 공통 컴포넌트 1개(additive optional prop)
- 한다: 메뉴/route/화면 도입, 기존 API·컴포넌트 재사용, typecheck, CHECK
- 하지 않는다: 신규 backend API/DB/migration, 거래 신청 화면 신설, Store HUB 제거, 주문 관리 변경, KPA/GP 화면 변경, OrderType/checkout/cart 변경

---

## 3. Changed Files

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx` | 선택적 `heading?: { title?; description? }` prop 추가. 미전달 시 기존 문구("상품 카탈로그" …) 기본값 유지 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | `COSMETICS_STORE_CONFIG` `매장 상품·거래` 그룹에 `{ key: 'products', label: '상품', subPath: '/commerce/products' }` 추가(주문 관리 위) |
| `services/web-k-cosmetics/src/App.tsx` | `StoreCommerceProductsPage` lazy import + `commerce/products` route mount |
| `services/web-k-cosmetics/src/pages/store/StoreCommerceProductsPage.tsx` | **신규** — SupplyCatalogHub thin wrapper(accent pink, tableId `kcos-store-commerce-products`, heading 주입, 기존 cosmetics API) |
| `docs/investigations/CHECK-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1.md` | 본 CHECK 문서(신규) |

> KPA/GP 상품 화면, OrderType, checkout/cart, Hero/Home/Header, 디지털 사이니지, 주문 관리, Store HUB route 미접촉. 신규 backend/DB/migration 0.

---

## 4. Route/Menu Alignment

| 항목 | 값 |
|---|---|
| 메뉴 그룹 | 매장 상품·거래 |
| 메뉴 label | 상품 |
| subPath | `/commerce/products` |
| route(App.tsx) | `commerce/products` → `StoreCommerceProductsPage` (mount 확인) |
| 최종 URL | `/store/commerce/products` |
| 데드링크 | 없음(메뉴·route 동시 추가) |
| capability 필터 | `products`는 `MENU_CAPABILITY_MAP` 미등록(주석 처리) → 항상 표시. menuCapabilityMap 변경 불요 |

화면 제목 "상품 관리" / 설명 "매장에서 거래할 상품을 확인하고 내 매장에 추가할 수 있습니다."

---

## 5. API/Data Source

- 재사용 API: `services/web-k-cosmetics/src/api/pharmacyProducts.ts`
  - `getCatalog()` → `GET /cosmetics/pharmacy/products/catalog` (공유 컨트롤러, `service_key=k-cosmetics`)
  - `applyBySupplyProductId()` → `POST /cosmetics/pharmacy/products/apply` (= 공급 상품 신청, ProductApproval PENDING. 신청 ≠ 주문)
  - `cancelProductByOfferId()` → `DELETE /cosmetics/pharmacy/products/by-offer/:offerId`
- 데이터 소스: 공통 `SupplierProductOffer` 기반 카탈로그(IR 확인). **신규 endpoint/DB 없음.**
- 이벤트/추천 배지: 본 1차에서는 공통 컴포넌트의 유통유형 탭(전체/B2B/운영자/공급 승인 대상)만 사용. 별도 이벤트 탭 미추가(IR §3.2 분리 금지 원칙 준수).

---

## 6. Store HUB Relationship

- `/store-hub/b2b`(`HubB2BPage`)는 그대로 유지(route·메뉴·동작 무변경).
- 동일 컴포넌트/API를 재사용하되 IA 위치·목적 구분:
  - `/store/commerce/products` = 내 매장 상품·거래 업무 화면(제목 "상품 관리")
  - `/store-hub/b2b` = Store HUB 공급 상품 탐색·신청(기본 제목 "상품 카탈로그")
- 두 화면은 `tableId`가 달라(`kcos-store-commerce-products` vs `kcos-store-hub-b2b-products`) 컬럼 폭 등 로컬 상태가 독립적.

---

## 7. Consumer Impact Matrix

공통 모듈 변경: `SupplyCatalogHub`(additive optional prop) + `storeMenuConfig`(KC 항목 추가). `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 적용.

| 소비처 | 영향 | 처리 | 결과 |
|---|---|---|---|
| K-Cosmetics 내 매장 | 있음 | 상품 메뉴/route/화면 추가, `heading` 주입 | PASS |
| K-Cosmetics HUB (`HubB2BPage`) | 없음 | `heading` 미전달 → 기본 "상품 카탈로그" 유지. config 영향 없음 | PASS |
| GlycoPharm HUB (`HubB2BCatalogPage`) | 없음 | `heading` 미전달 → 기본 문구 유지. GP config 무변경 | PASS |
| KPA-Society | 없음 | KPA는 자체 `HubB2BCatalogPage`(별도, SupplyCatalogHub 미사용) + 독자 상품 화면. config 무변경 | PASS |
| Neture | 없음 | 내 매장 상품·거래 대상 아님 | PASS |

> `SupplyCatalogHub` 소비처 전수: GP `HubB2BCatalogPage`, KC `HubB2BPage` 2곳 — 둘 다 `heading` 미전달 확인.

---

## 8. TypeScript Result

```
packages/store-ui-core : npx tsc --noEmit -p tsconfig.json → EXIT 0
services/web-k-cosmetics: npx tsc --noEmit -p tsconfig.json → EXIT 0
```

- `@o4o/store-ui-core` main/types = `./src/index.ts`(소스 직접 참조) → 별도 rebuild 불요, 신규 prop 즉시 인식.
- 결과: 모두 PASS.

---

## 9. Browser Smoke Result

- 상태: **배포 후 수행 예정 (PENDING)**
- 확인 항목:
  1. `/store` 진입 → 사이드바 `매장 상품·거래` 아래 `상품` 표시
  2. `상품` 클릭 → `/store/commerce/products` 진입
  3. 제목 "상품 관리" + 설명 표시
  4. 상품 목록 또는 empty/loading/error state 정상(크래시 없음)
  5. 주문 관리(`/store/commerce/orders`) 기존 동작 유지
  6. `/store-hub/b2b` 기존 동작·기본 제목 유지
  7. console critical error 없음

---

## 10. Regression Check

- `SupplyCatalogHub` 변경은 optional prop 추가 + 헤더 텍스트를 변수화(기본값 = 기존 리터럴 동일)뿐 → 미전달 소비처 동작/표시 불변.
- `storeMenuConfig` 변경은 KC 그룹에 item 1개 추가뿐 → KPA/GP/Neture config 블록 무변경.
- App.tsx 변경은 lazy import + route 1개 추가뿐 → 기존 route 무변경. `commerce/products/:productId/marketing|pop` 등 하위 경로와 충돌 없음(정확 경로 매칭).
- menuCapabilityMap 무변경(products 미매핑 → 항상 표시).

---

## 11. Follow-ups

- 배포 후 browser smoke 수행 및 본 문서 §9 갱신
- (선택) `WO-O4O-PRODUCT-DESCRIPTION-EDITOR-NEW-ENTRY-V1` 등과 별개로, 내 매장 상품 화면의 거래 신청/주문 흐름 정렬은 `WO-O4O-STORE-COMMERCE-TRADE-APPLICATION-INTEGRATION-V1`(IR 후속 P5)에서 다룸
- (선택) `WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1` — KPA 기준 GP/KC 공통 정렬 시 내 매장 상품 화면 컬럼/탭 표준화
- (선택) `WO-O4O-KCOSMETICS-STOREFRONT-PRODUCT-DETAIL-V1` — 소비자 상품 상세(IR-PRODUCT-DESCRIPTION-PRODUCTION-FLOW 판정 관련)
