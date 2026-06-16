# IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1

> 조사 전용 IR. 코드 수정 없음.
> 기준 문서: `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`, `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md`
> 선행: `WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2` + capability filter fix (사이드 메뉴 정렬 완료)
> 작성일: 2026-06-16

---

## 1. Summary

사이드 메뉴 트리(`상품·거래 > 상품 / 주문 관리 / 거래 신청`)는 canonical 정렬이 완료되었으나, **`상품·거래 > 상품` 화면 본문은 3서비스에서 parity가 맞지 않는다.**

| 서비스 | URL | 본문 화면 | 판정 |
|---|---|---|---|
| **KPA-Society** | `/store/commerce/products` | `PharmacyB2BPage` — 실제 거래 가능 상품 화면 (도메인 탭 5개 + 작업대 흐름) | **B. FUNCTIONAL** |
| **GlycoPharm** | `/store/management/b2b` | `PharmacyB2BProducts` — "B2B UI 검증용 화면" 배너 노출, 일반 상품 API 재사용 | **D. VALIDATION_SCREEN** |
| **K-Cosmetics** | (없음) | "상품" 메뉴 자체 미정의 — `상품·거래` 그룹 = 주문 관리만 | **F. MISSING** |

핵심 결론:
1. **GlycoPharm은 검증용 화면이 운영 메뉴에 노출**되고 있다 (사용자에게 "WordPress 스타일 테이블 UI 검증용", "백엔드 구현 대기" 문구가 보임). → Drift / 운영 부적합.
2. **K-Cosmetics는 "상품" 화면이 아예 없다.** 공급 상품 신청은 `/store-hub/b2b`(Store HUB)로 분리되어 사이드 메뉴 밖에 있음.
3. **KPA가 유일하게 운영 화면에 가깝다.** 단 "FUNCTIONAL" 수준 (탭/액션 정리 여지 있음). cross-service 기준 화면 후보로 적합.
4. 백엔드 데이터 소스도 갈라져 있다: KPA/KC = `SupplierProductOffer`(공통), GlycoPharm = `glycopharm_products`(레거시 별도 테이블).

후속 WO는 **GP 운영화 + KC 도입 + KPA 기준 parity** 3단계로 제안한다 (§13).

---

## 2. Scope

조사 대상:
- KPA-Society — `/store/commerce/products`
- GlycoPharm — `/store/management/b2b`
- K-Cosmetics — `상품·거래 > 상품` (존재 여부 포함)

제외:
- **Neture** — 내 매장/내 약국 상품·거래 대상 아님 (공급자/파트너 도메인). Consumer Impact Matrix에 `미사용 / 영향 없음`으로 기록.

본 IR은 `상품·거래 > 상품` 화면만 직접 조사한다. `내 약국 제품 / 내 매장 제품`(POP/QR/블로그 제작 기준 데이터)은 의미가 다르므로 직접 조사 대상 아님 — 단 용어 혼재만 함께 확인 (§ 6, 7, 8).

---

## 3. Current Canonical Menu Context

`packages/store-ui-core/src/config/storeMenuConfig.ts` 기준 (공통 모듈):

### KPA-Society — `KPA_SOCIETY_STORE_CONFIG` (storeMenuConfig.ts:236-287)
```text
[약국 상품·거래]  (라인 245)
- 상품      → subPath /commerce/products   (라인 248)
- 주문 관리  → subPath /commerce/orders
```
> KPA에는 "거래 신청" 메뉴 항목이 없음 (대신 화면 내부 "판매 신청" 탭으로 처리).

### GlycoPharm — `GLYCOPHARM_STORE_CONFIG` (storeMenuConfig.ts:164-224)
```text
[약국 상품·거래]  (라인 174-180)
- 상품      → subPath /management/b2b   ← 검증용 화면으로 mount
- 거래 신청  → subPath /b2b-order
- 주문 관리  → subPath /commerce/orders
```
> 주석(storeMenuConfig.ts:160-162): "상품 = 공급자 거래 상품(B2B). GlycoPharm 의 owner 상품 화면은 /management/b2b(PharmacyB2BProducts), 거래 신청은 /b2b-order."

### K-Cosmetics — `COSMETICS_STORE_CONFIG` (storeMenuConfig.ts:97-152)
```text
[매장 상품·거래]  (라인 106)
- 주문 관리  → subPath /commerce/orders   (라인 109)   ← 유일
```
> 주석(storeMenuConfig.ts:94): "KC는 공급자 상품/거래 신청 라우트 부재로 상품·거래=주문 관리만."
> 주석(storeMenuConfig.ts:30-31): "원칙: 데드링크 생성 0 / 실기능 메뉴 은폐 0. 라우트 없는 항목은 해당 서비스에서 미추가."

**관찰:** 메뉴 트리는 정렬되었으나, "상품" 항목이 가리키는 본문 화면의 성숙도가 KPA(운영) → GP(검증용) → KC(부재) 순으로 크게 다르다.

---

## 4. Consumer Impact Matrix

본 IR은 조사 전용이므로 공통 모듈을 변경하지 않는다. 아래는 조사 범위 영향 기록이다.

| 소비처 | 사용 여부 | 조사 영향 | route/role/capability 확인 | 결과 |
|---|---:|---|---|---|
| KPA-Society | 사용 | 있음 | `/store/commerce/products` mount 확인 (App.tsx:939), `PharmacyGuard`, capability `products` | **PASS** — 운영 화면 존재 |
| GlycoPharm | 사용 | 있음 | `/store/management/b2b` mount 확인 (App.tsx:1036), `PharmacyStoreGuard` | **NOTE** — 검증용 문구 노출 |
| K-Cosmetics | 사용 | 있음 | `상품·거래` 그룹에 `products` 키 미등록 (storeMenuConfig.ts:106-109), 상품 route 부재 | **NOTE** — 상품 화면 부재 |
| Neture | 미사용 | 없음 | 내 매장/내 약국 상품·거래 대상 아님 | **PASS** |

> 공통 모듈 `storeMenuConfig.ts` 는 4개 서비스가 공유한다. 후속 WO에서 이 파일을 변경할 경우 `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 에 따라 KPA/GP/KC/Neture 4개 소비처 + admin/operator/store 영향을 모두 재검증해야 한다.

---

## 5. Route/Menu Matrix

| Service | Menu Group | Label | Route/SubPath | URL | Component | Exists | Classification | Notes |
|---|---|---|---|---|---|---|---|---|
| KPA | 약국 상품·거래 | 상품 | `/commerce/products` | `/store/commerce/products` | `PharmacyB2BPage` (`services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx`) | YES | **B. FUNCTIONAL** | App.tsx:939 mount. 도메인 탭 5개, 작업대 담기 흐름. 검증 문구 없음 |
| GlycoPharm | 약국 상품·거래 | 상품 | `/management/b2b` | `/store/management/b2b` | `PharmacyB2BProducts` (`services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx`) | YES | **D. VALIDATION_SCREEN** | App.tsx:1036 mount. "B2B UI 검증용 화면" 배너(라인 145-150) + 헤더 주석(라인 2-6) |
| GlycoPharm | 약국 상품·거래 | 거래 신청 | `/b2b-order` | `/store/b2b-order` | `B2BOrderPage` | YES | (참고) | 거래 신청은 별도 페이지로 분리됨 |
| K-Cosmetics | 매장 상품·거래 | 상품 | — | — | — | **NO** | **F. MISSING** | storeMenuConfig.ts에 `products` 키 미등록. route 미마운트. 공급 상품 신청은 `/store-hub/b2b`(HubB2BPage)로 분리 |
| K-Cosmetics | 매장 상품·거래 | 주문 관리 | `/commerce/orders` | `/store/commerce/orders` | `StoreOrdersPage` | YES | (참고) | 상품·거래 그룹의 유일 항목 |
| Neture | — | — | — | — | — | N/A | — | 내 매장/내 약국 대상 아님 |

---

## 6. KPA Product Page Findings

**컴포넌트:** `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx` (mount: App.tsx:939, guard: `PharmacyGuard`)

### 화면 본문 구조
- **제목:** "상품 관리" / **설명:** "매장에서 취급하는 상품을 서비스별로 탐색합니다" (라인 314-315)
- **검증/테스트 문구:** **없음** ✅
- **상단 탭 (상품 도메인 네비, 라인 320-324):**
  - "B2B 구매" (`/store/commerce/products`, 현재 화면)
  - "판매 신청" (`/store/commerce/products/b2c`, `PharmacySellPage`)
- **도메인 탭 (DOMAIN_TABS, 라인 42-48):** 전체 / 일반 B2B(`kpa`) / Event Offer(`kpa-groupbuy`) / 혈당관리(`glycopharm`) / 화장품(`cosmetics`) — 5개
  - Event Offer 탭은 별도 컴포넌트 `<EventOfferContentPanel compact />` 렌더 (라인 343-344) → **별도 사이드 메뉴 아닌 화면 내부 탭으로 처리됨** (canonical §3.1 요건 충족)
- **리스트:** `DataTable<B2BProduct>` (라인 219-305). 컬럼 = 상품명 / 공급사(`supplierName`) / 서비스 배지 / 소매가 / 수량 입력 / 등록일
- **공급자명:** 표시(공급사 컬럼). **가격:** 표시(소매가). **재고/상태:** 미표시
- **검색:** 없음 (탭 필터만)
- **Empty state:** 탭별 문구 (예: "내 매장에 추가된 상품이 없습니다" + `/store-hub/b2b` 링크, 라인 61-67)
- **액션:** "작업대 담기" → 선택 상품+수량 sessionStorage → `/store/commerce/order-worktable` (라인 162-204). 직접 주문/장바구니 버튼 없음

### 핵심 질의 응답
- **canonical 상품 화면으로 적합?** → YES. 실제 거래 가능 상품 표시 + 주문 작업대 흐름 연결. cross-service 기준 화면 후보.
- **"B2B 구매 / 판매 신청" 탭 의미?** → B2B 구매 = 약국이 공급자 상품 주문(현재). 판매 신청 = 약국이 자사 상품 판매 신청(b2c).
- **"판매 신청"이 거래 신청과 같은 흐름?** → 다른 흐름. 판매 신청은 b2c 자사 상품 등록 측. (GP의 "거래 신청"=`/b2b-order`와 의미 다름)
- **주문 관리로 이어지는 흐름?** → 작업대(`order-worktable`) 경유. 주문 생성은 Store Cart/checkout 흐름.
- **상품/제품 용어 혼재?** → 현 화면 내부는 일관(상품). 메뉴 레벨에서 "상품"(거래) vs "내 약국 제품"(제작 앵커, `/store/my-products`) 의도적 구분 유지.

### 판정: **B. FUNCTIONAL**
주요 기능(거래 가능 상품 표시 + 도메인 탭 + 작업대)은 갖췄으나, 검색 부재·재고/상태 미표시·거래신청/판매신청 흐름 분산 등 정리 여지가 있어 PRODUCTION_READY(A)는 아님.

---

## 7. GlycoPharm Product Page Findings

**컴포넌트:** `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx` (mount: App.tsx:1036, lazy, guard: `PharmacyStoreGuard`)

### 검증용 문구 (원문, 운영 화면 노출 확인)
파일 헤더 주석 (라인 2-6, 직접 확인):
```
PharmacyB2BProducts - B2B 상품 리스트 (WordPress 스타일 UI 검증용)
※ 본 화면은 B2B 주문 UI 검증용입니다.
  실제 B2B 전용 상품 API는 백엔드 구현 대기 중입니다.
```
화면 배너 (사용자 노출, 라인 140-153):
- 배너 제목 (라인 145): **"B2B UI 검증용 화면"**
- 배너 본문 (라인 147-150): **"본 화면은 WordPress 스타일 테이블 UI 검증을 위한 페이지입니다. 실제 B2B 전용 상품 API는 백엔드 구현 대기 중이며, 현재는 일반 상품 API를 사용하여 UI/UX를 테스트합니다."**

→ **운영 메뉴(`상품·거래 > 상품`)에서 진입하는 화면에 검증용 배너가 그대로 노출됨.** 운영 화면 부적합 확정.

### 화면 본문 구조
- AlertCircle 검증 배너 → "B2B 상품 관리" 헤더(동적 개수) → 검색(상품명) → `DataTable`(이미지/상품명/공급자/카테고리/가격/재고/상태/액션, 라인 54-60) → 페이지네이션(처음/이전/다음/마지막)
- Empty state: "등록된 상품이 없습니다."
- KPA보다 컬럼은 많으나(재고/상태 포함) **데이터 소스가 일반 상품 API 재사용**이라 실제 B2B 거래 데이터가 아님

### API / 데이터 소스
- frontend: `pharmacyApi.getProducts()` → `GET /glycopharm/pharmacy/products` (`services/web-glycopharm/src/api/pharmacy.ts:416-432)
- 데이터 소스: **`glycopharm_products` (GlycopharmProduct, 레거시 별도 테이블)** — KPA/KC가 쓰는 공통 `SupplierProductOffer`가 아님
- 별도 `/glycopharm/b2b/products` 엔드포인트(`pharmacy.controller.ts:221`, `type=franchise|general`)는 **존재하나** 레거시 GlycopharmProduct 기반이며, 이 검증 화면은 이를 쓰지 않고 일반 `/pharmacy/products`를 씀
- 거래 신청은 별도 `/b2b-order`(`B2BOrderPage`)에서 `/glycopharm/b2b/products?type=...` 호출 → 장바구니 흐름

### 핵심 질의 응답
- **`/store/management/b2b`가 검증용?** → YES. 헤더 주석 + 화면 배너 모두 명시.
- **"백엔드 구현 대기" 문구 유효?** → 부분적. B2B 전용 API(`/b2b/products`)는 코드상 존재하나 레거시 스키마이며, 화면은 그것조차 안 쓰고 일반 상품 API 테스트 중. "전용 API 미연동" 상태.
- **상품 리스트가 실제 거래 가능 상품?** → 아니오. 일반 상품 API 테스트 데이터.
- **KPA 구조 재사용 가능?** → 가능. KPA `PharmacyB2BPage`는 공통 카탈로그/리스팅 API(`SupplierProductOffer`/`OrganizationProductListing`) 기반이라 GP에 이식 가능. 단 GP 레거시 `glycopharm_products` 의존을 끊는 데이터 정렬 필요.
- **운영 전환 최소 수정 범위(예비):** ① 검증 배너 제거, ② 데이터 소스를 공통 카탈로그/리스팅 API로 교체(또는 `/b2b/products` 운영화), ③ 거래 신청(`/b2b-order`)·주문 관리 흐름 연결 확인.

### 판정: **D. VALIDATION_SCREEN**

---

## 8. K-Cosmetics Product Page Findings

**상품 화면: 없음 (F. MISSING).**

### 근거
- `COSMETICS_STORE_CONFIG`의 `매장 상품·거래` 그룹(storeMenuConfig.ts:106)에 **`orders`(주문 관리)만** 등록(라인 109). `products` 키 미정의.
- 주석(라인 94): "KC는 공급자 상품/거래 신청 라우트 부재로 상품·거래=주문 관리만."
- `menuCapabilityMap.ts`에서 KC `products` 매핑 제거(공통 정책) → capability 필터 이전에 **config 미등록 + route 미마운트**가 1차 원인.
- "상품" route(`/store/commerce/products` 류) 미마운트, 전용 owner 상품 컴포넌트 부재.

### 현 구조
- `매장 상품·거래` = 주문 관리(`/store/commerce/orders`, `StoreOrdersPage`)만
- 공급 상품 조회/신청은 **Store HUB로 분리**: `/store-hub/b2b` (`HubB2BPage` → `SupplyCatalogHub`, accent=pink). 사이드 "내 매장" 메뉴 밖
- 거래 신청 메뉴/페이지 없음 (`/b2b-order` 미존재)

### 핵심 질의 응답
- **"상품" 메뉴 노출?** → 미노출. 이유 = config 미등록 + route 부재 (의도적, 데드링크 방지 정책).
- **주문 관리만으로 충분?** → 운영 관점에서 불충분. 약국/매장이 거래할 상품을 "내 매장" 안에서 볼 화면이 없고, HUB로 나가야 함. KPA/GP와 IA 불일치(Drift).
- **상품 리스트 화면이 이미 존재?** → "내 매장" 사이드 메뉴에는 없음. HUB(`/store-hub/b2b`)에만 존재.
- **거래 신청 기능?** → 없음.
- **KPA 구조 재사용 가능?** → 가능. KC 백엔드는 KPA와 **동일 컨트롤러** `createPharmacyProductsController(..., 'cosmetics')`(`cosmetics.routes.ts:133`) + 공통 `SupplierProductOffer` 사용. 프론트 화면만 부재 → KPA `PharmacyB2BPage` 이식 친화적.
- **화장품 카테고리/브랜드/공급자/이벤트:** HUB `SupplyCatalogHub` 응답에 category/supplierName/supplierLogoUrl/priceGeneral/distributionType 등 이미 존재(`pharmacyProducts.ts:15-36`). 이벤트는 `/store-hub/event-offers` 별도.
- **메뉴 사라짐 흔적?** → 없음. 의도적 미추가(데드링크 0 정책).

### 판정: **F. MISSING**

---

## 9. API/Data Source Matrix

| Service | Screen | Frontend API | Backend route | Main data source | Real trade data? | Notes |
|---|---|---|---|---|---|---|
| KPA | 상품 | `getListings()` + `getCatalog()` (`api/pharmacyProducts.ts`) | `GET /kpa/pharmacy/products/listings`, `GET /kpa/pharmacy/products/catalog` | `OrganizationProductListing` ⊕ `SupplierProductOffer` | **YES** | listing(내 매장) + catalog(공급자) 병합 |
| GP | 상품 | `pharmacyApi.getProducts()` (`api/pharmacy.ts:416`) | `GET /glycopharm/pharmacy/products` | **`glycopharm_products`(레거시)** | **NO** | 일반 상품 API 테스트. 검증용 |
| GP | 거래 신청 | (B2BOrderPage) | `GET /glycopharm/b2b/products?type=franchise\|general` (`pharmacy.controller.ts:221`) | `glycopharm_products`(is_featured) | 부분 | 코드 존재, 레거시 스키마 |
| KC | 상품 | — (화면 부재) | — | — | — | 사이드 메뉴에 상품 화면 없음 |
| KC | (대체) HUB B2B | `getCatalog()` (`api/pharmacyProducts.ts`) | `GET /cosmetics/pharmacy/products/catalog` | `SupplierProductOffer` (KPA 동일 컨트롤러) | YES | `/store-hub/b2b`, 신청 전용 |

### 공통 도메인 엔티티 (백엔드, 모두 존재)
- `ProductMaster` — 플랫폼 상품 SSOT (barcode 1:1)
- `SupplierProductOffer` — 공급자 공급 제안 (distributionType PUBLIC/SERVICE/PRIVATE, approvalStatus). **KPA/KC 카탈로그 기반**
- `ProductApproval` — 공급자 Offer → 약국 승인 추적 (SERVICE 타입)
- `OrganizationProductListing` — 약국/매장 진열 상품 최종 상태 + **EventOffer 필드(별도 테이블 없음)**
- `StoreLocalProduct` — 매장 자체 상품 (Display only, Checkout 연결 금지)
- `glycopharm_products` (`GlycopharmProduct`) — **GP 전용 레거시 테이블** (공통 도메인 미정렬 지점)

> 핵심 격차: **KPA/KC는 공통 `SupplierProductOffer`** 위에 있고, **GP만 레거시 `glycopharm_products`** 위에 있다. GP 운영화는 화면 문구 제거뿐 아니라 데이터 소스 정렬을 동반해야 진정한 parity가 된다.

---

## 10. Cross-Service Gaps

1. **화면 성숙도 격차:** KPA(FUNCTIONAL) / GP(VALIDATION_SCREEN) / KC(MISSING). 같은 "상품" 메뉴인데 본문이 운영/검증/부재로 3원화.
2. **검증용 노출(Drift):** GP 운영 메뉴 진입 화면에 "검증용/WordPress 스타일/백엔드 구현 대기" 문구 노출.
3. **IA 불일치:** KC는 거래 상품을 "내 매장" 안에서 못 보고 Store HUB로 나가야 함. KPA/GP는 "내 매장" 안에서 봄.
4. **데이터 소스 분기:** KPA/KC=`SupplierProductOffer`(공통), GP=`glycopharm_products`(레거시). 공통 도메인 정렬 미완.
5. **거래 신청 흐름 비대칭:** KPA="판매 신청" 탭(b2c) / GP="거래 신청" 별도 페이지(`/b2b-order`) / KC=없음. 용어·위치·흐름 모두 다름.
6. **컬럼/표시 비대칭:** KPA(재고·상태 미표시) vs GP(재고·상태 표시). 표준 컬럼 세트 부재.

---

## 11. Reuse Opportunities

1. **KPA `PharmacyB2BPage`를 cross-service 기준 화면으로 채택.** 도메인 탭(전체/일반 B2B/Event Offer/타서비스) + 작업대 흐름이 canonical §3.1(상품 내부 탭/배지 처리, 별도 메뉴 분리 금지)에 부합.
2. **공통 백엔드 이미 정렬됨 (KPA↔KC):** `createPharmacyProductsController(dataSource, auth, serviceKey)` — KC도 `'cosmetics'`로 동일 컨트롤러 사용. KC는 **프론트 화면만 추가**하면 됨.
3. **GP `/b2b/products` 엔드포인트 존재:** 운영화 시 신규 API 0이 아니라 레거시 정리/공통 정렬 수준.
4. **HUB `SupplyCatalogHub` 컴포넌트 재사용:** KC가 이미 `/store-hub/b2b`에서 카탈로그를 렌더 중 → "내 매장" 상품 화면으로 이 컴포넌트/API 재활용 가능.
5. **EventOffer 공통 흐름:** 3서비스 모두 `OrganizationProductListing` 이벤트 필드 + 공유 `EventOfferService` 사용 → 상품 화면 내 이벤트 탭 통일 용이.

---

## 12. Risks

- **공통 모듈 변경 리스크:** `storeMenuConfig.ts`는 4서비스 공유. KC에 `products` 추가 시 Neture 포함 전 소비처 재검증 필요(`SHARED-MODULE-CHANGE-PROTOCOL-V1`). 빈 그룹/capability 필터로 다른 서비스 메뉴가 사라지지 않는지 확인.
- **GP 레거시 데이터 단절 리스크:** `glycopharm_products` → 공통 `SupplierProductOffer` 전환 시 기존 GP 상품 데이터 매핑/마이그레이션 필요. 화면 문구만 지우면 빈 화면/오류 위험.
- **데드링크/기능 은폐 리스크:** KC 상품 메뉴 추가는 route 마운트와 동시여야 함(route 없는 메뉴 노출 금지, CLAUDE.md §Shared Module Rule).
- **거래 신청 용어 통일 리스크:** "판매 신청"(KPA b2c) vs "거래 신청"(GP b2b)은 의미가 반대 방향. 섣불리 통합하면 흐름 왜곡.
- **OrderType 계약:** GLYCOPHARM OrderType은 BLOCKED(CLAUDE.md §4). GP 상품→주문 흐름은 E-commerce Core/Store Cart 경유 여부 확인 필수.

---

## 13. Recommended WO Sequence

| 순위 | WO 후보 | 목적 | 대상 | 재사용 | 신규 | 위험도 | 선행 조건 |
|---|---|---|---|---|---|---|---|
| 1 | **WO-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-PAGE-PRODUCTIONIZE-V1** | GP 검증용 화면 → 운영 상품 화면 전환 (배너 제거 + 데이터 소스 공통 정렬) | GlycoPharm | KPA `PharmacyB2BPage`, 공통 카탈로그 API | GP 데이터 정렬 | 중 | 본 IR |
| 2 | **WO-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1** | KC "상품" 화면 도입 (메뉴+route+화면) | K-Cosmetics | 동일 컨트롤러(`'cosmetics'`), HUB `SupplyCatalogHub` | 프론트 화면 1 | 중 | 본 IR, storeMenuConfig 변경 프로토콜 |
| 3 | **WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1** | KPA 기준 구조로 GP/KC 공통 정렬 (컬럼/탭/배지/empty 표준) | 3서비스 | KPA 기준 | 공통화 추출 | 중 | WO 1, 2 |
| 4 | **WO-O4O-STORE-COMMERCE-PRODUCT-INTERNAL-TABS-BADGES-V1** | 상품 내부 탭/배지(전체/거래가능/신청필요/이벤트/공급자) 정리 — 별도 메뉴 분리 금지 | 3서비스 | KPA DOMAIN_TABS | 표준 정의 | 하 | WO 3 |
| 5 | **WO-O4O-STORE-COMMERCE-TRADE-APPLICATION-INTEGRATION-V1** | 거래 신청/판매 신청/신청 상태 흐름 용어·위치 통일 | 3서비스 | 기존 `/b2b-order`, b2c 탭 | 흐름 정의 | 중 | WO 3 |

**권장 진행:** 우선 **WO 1(GP 운영화)** 단독으로 가장 큰 Drift(검증용 노출)를 제거하고, 그 다음 **WO 2(KC 도입)** → **WO 3(parity)** 순서. WO 4·5는 parity 확정 후 정리 단계.

---

## 14. Out of Scope

본 IR은 다음을 하지 않는다: 코드 수정 / 라우트 수정 / 메뉴 수정 / API 구현 / DB migration / 상품 화면 리팩터링 / GP 검증 문구 제거 / KC 상품 화면 신설 / KPA 화면 변경 / 배포.

`내 약국 제품 / 내 매장 제품`(POP·QR·블로그 제작 기준 데이터) 화면은 직접 조사 대상 아님 (용어 구분만 확인).

---

## 15. Evidence

### 프론트엔드
- KPA mount: `services/web-kpa-society/src/App.tsx:939` (`commerce/products` → `PharmacyB2BPage`)
- KPA 화면: `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx` (제목 314-315, 도메인 탭 42-48, DataTable 219-305, 작업대 162-204)
- KPA API: `services/web-kpa-society/src/api/pharmacyProducts.ts` (getListings 155-159, getCatalog 93-102, 병합 86-133)
- GP mount: `services/web-glycopharm/src/App.tsx:1036` + lazy 86 (`management/b2b` → `PharmacyB2BProducts`)
- GP 화면: `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx` (헤더 주석 2-6 [직접 확인], 검증 배너 145-150, 컬럼 54-60, API 호출 32)
- GP API: `services/web-glycopharm/src/api/pharmacy.ts:416-432` (`/glycopharm/pharmacy/products`)
- GP 거래신청: `services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx`
- KC config: `packages/store-ui-core/src/config/storeMenuConfig.ts:97-152` (그룹 106, 주문 관리 109, 주석 94)
- KC 대체 HUB: `services/web-k-cosmetics/.../hub/HubB2BPage.tsx`, `services/web-k-cosmetics/src/api/pharmacyProducts.ts:15-36`
- 공통 메뉴: `packages/store-ui-core/src/config/storeMenuConfig.ts` (KPA 236-287/248, GP 164-224/174-180, KC 97-152/106-109, 정책 주석 30-31)

### 백엔드
- KPA routes: `apps/api-server/.../kpa.routes.ts:374` (`createPharmacyProductsController(..., 'kpa')`)
- GP routes: `.../glycopharm.routes.ts:237` (pharmacy), `pharmacy.controller.ts:221` (`/b2b/products`)
- KC routes: `.../cosmetics.routes.ts:133` (`createPharmacyProductsController(..., 'cosmetics')`)
- 엔티티: `ProductMaster.entity.ts`, `SupplierProductOffer.entity.ts:36`, `ProductApproval.ts:33`, `organization-product-listing.entity.ts:27`, `store-local-product.entity.ts:25`, `GlycopharmProduct`(레거시)
