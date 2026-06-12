# IR-O4O-MY-STORE-COMMONIZATION-PHASE6-GP-KCOS-APPLICATION-SCOPE-V1

> **유형**: Investigation (read-only) — KPA 내 매장 기준의 GlycoPharm/K-Cosmetics 적용 범위 + 공통화 가능성 판정.
> **성격**: 코드/DB/migration/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **B/C 혼합** — `my-products`(O4O 주문 가능 상품)는 **이미 공통 패키지로 공통화 완료(A)**. `local-products`는 동일 모델·동일 타입 3중복 → **추출 후보(B)**. `orders`/`event-offers`/`b2b-hub`는 서비스별 별도 구현 → **parity 확인 후(C)**, 특히 **주문 원장·공급자 가시성은 별도 IR(D)**.
> **선행**: 유통참여형 펀딩 Neture-only 라인 종결(Store 연결 제거) → Phase 6 는 펀딩 제외한 깨끗한 기준에서 진행.
> **작성일**: 2026-06-12

---

## 1. 목적
KPA 내 매장 5-카테고리 모델(매장 취급 상품 / O4O 주문 가능 상품 / 신청·승인 / 이벤트형 / 주문 내역)을 GP·KCos 에 적용 가능한지 조사하고, 공통화를 ① 바로 가능 ② parity 보정 후 ③ 일부 제외 ④ 추가 IR 중 어디로 진행할지 판정한다.

## 2. 배경
- KPA 기준선: my-products=OrganizationProductListing(OPL, 반복 주문) / local-products=StoreLocalProduct(주문 무관) / ProductApproval(승인 전) / EventOffer+store_cart_items(이벤트 주문) / checkout_orders(원장).
- heading/IA 정렬 완료: `/store/my-products`="O4O 주문 가능 상품", `/store/commerce/local-products`="매장 취급 상품".

## 3. 선행 기준
유통참여형 펀딩 = Neture 전용(Store 미연결). 본 IR 의 Store 공통화 범위에서 **펀딩 제외**.

## 4. 조사 범위
대표=KPA, 적용=GP/KCos, 제외=Neture. 대상 route: `/store/my-products`·`/store/commerce/local-products`·`/store/commerce/orders`·`/store-hub/{b2b,event-offers,cart}`. (read-only, App.tsx + 컴포넌트/엔티티 근거.)

---

## 5. Phase 1 — GP/KCos route/component/API 매핑

| 영역 | KPA | GlycoPharm | K-Cosmetics | 공유? |
|------|-----|-----------|-------------|:---:|
| my-products | `StoreProductsManagerPage`(**`@o4o/store-products-ui`**), title "O4O 주문 가능 상품" | 동일 컴포넌트+title (RoleGuard 래핑) | 동일 컴포넌트+title | **✅ 공통 패키지** |
| local-products | `pages/pharmacy/StoreLocalProductsPage` + `api/localProducts` | `pages/store-management/StoreLocalProductsPage` + `api/localProducts` | `pages/store/StoreLocalProductsPage` + `services/localProductApi` | ❌ 3중복(동일 타입) |
| commerce/orders | `StoreOrdersPage`(`pages/pharmacy/`) | `PharmacyOrders`(`pages/store-management/`) | `StoreOrdersPage`(`pages/store/`) | ❌ 3별도 |
| store-hub/b2b | `HubB2BCatalogPage`(`pages/pharmacy/`) | `HubB2BCatalogPage`(`pages/hub/`) | `HubB2BPage`(`pages/hub/`) | ❌ 3별도(이름 2/3 동일·파일 상이) |
| store-hub/event-offers | `KpaEventOfferPage`(enriched VM) | `HubEventOffersPage`(`pages/hub/`) | `HubEventOffersPage`(`pages/hub/`) | ❌ 3별도 |

> App.tsx 근거: KPA `my-products`(926)·`local-products`(940)·`commerce/orders`(945); GP `my-products`(914-918)·`local-products`(922)·`commerce/orders`(924); KCos `my-products`(712)·`local-products`(719)·`commerce/orders`(721). import: `StoreProductsManagerPage` ← `@o4o/store-products-ui`(3서비스 공통), `StoreLocalProductsPage`/orders/hub ← 서비스별 로컬.

---

## 6. Phase 2 — O4O 주문 가능 상품(my-products) 비교

| 서비스 | 기준 컴포넌트 | entity | title/desc | 판정 |
|--------|--------------|--------|-----------|:---:|
| KPA | `@o4o/store-products-ui` StoreProductsManagerPage | OrganizationProductListing | "O4O 주문 가능 상품" / 승인 후 반복 주문 | A |
| GP | 동일 | 동일 | 동일(약국 문맥) | A |
| KCos | 동일 | 동일 | 동일(매장 문맥) | A |

> **단일 공통 컴포넌트**이므로 PENDING ProductApproval 혼입/`is_active` 조건/주문 버튼 로직이 **3서비스 동일**(컴포넌트 내부 1곳). 차이는 route 가드 래핑(KPA `PharmacyOwnerOnlyGuard` / GP `RoleGuard` / KCos 없음)뿐. → **이미 공통화 완료(A)**. ProductApproval 혼입 위험은 공통 컴포넌트 기준으로 단일 관리.

## 7. Phase 3 — 매장 취급 상품(local-products) 비교

| 서비스 | page 파일 | API client | 타입 | backend endpoint | O4O 주문 연결 | 판정 |
|--------|----------|-----------|------|------------------|:---:|:---:|
| KPA | `pages/pharmacy/StoreLocalProductsPage` | `api/localProducts` | `LocalProduct/Input/BadgeType` | `${BASE}/local-products` | 없음(주문 무관) | B |
| GP | `pages/store-management/StoreLocalProductsPage` | `api/localProducts` | 동일 | `/store/local-products` | 없음 | B |
| KCos | `pages/store/StoreLocalProductsPage` | `services/localProductApi` | 동일 | `${BASE}/local-products` | 없음 | B |

> **동일 타입(`LocalProduct/LocalProductInput/BadgeType`) + 동일 백엔드 모델(StoreLocalProduct, `/local-products`)** 인데 page+client 가 **3중복**. endpoint prefix 만 상이(KPA/KCos `${BASE}/local-products`, GP `/store/local-products`). → **공통 컴포넌트 추출 후보(B)** — config(서비스별 BASE/문맥 라벨) prop 화로 추출 가능. 주문 미연결은 3서비스 공통(정합).

## 8. Phase 4 — 이벤트형 O4O 주문 가능 상품(event-offers) 비교

| 서비스 | route | 컴포넌트 | cart 연결 | 판정 |
|--------|-------|----------|----------|:---:|
| KPA | `/store-hub/event-offers` | `KpaEventOfferPage`(enriched ViewModel) | `/store-hub/cart` | C |
| GP | `/store-hub/event-offers` | `HubEventOffersPage` | `/store-hub/cart` | C |
| KCos | `/store-hub/event-offers` | `HubEventOffersPage`(별도 파일) | `/store-hub/cart` | C |

> 3서비스 모두 **동일 cart 흐름(`/store-hub/cart`)** + EventOffer 모델 사용(흐름 정합) 이나 **페이지 컴포넌트는 3별도**(KPA 는 enriched VM 으로 분기). 종료/만료 주문 차단은 EventOffer 공통 도메인 기준(선행 baseline) → 동일 가능성 높으나 **컴포넌트 parity 확인 필요(C)**. cart-connection 자체는 일관.

## 9. Phase 5 — 주문/공급자 리스트 정합성

| 서비스 | commerce/orders 컴포넌트 | 원장 기반 | 비고 | 판정 |
|--------|--------------------------|:---:|------|:---:|
| KPA | `StoreOrdersPage` | **checkout(`api/checkout`) 확인** | checkout_orders | C |
| GP | `PharmacyOrders` | **미확인**(quick grep 으로 checkout literal 미검출) | 별도 API 패턴 가능 | D |
| KCos | `StoreOrdersPage`(별도) | **미확인** | 동상 | D |

> KPA 만 checkout_orders 기반 확인. **GP/KCos 주문 원장 기반(checkout_orders vs legacy)·결제 상태 기준·공급자 통합 주문 리스트 가시성은 본 IR 범위에서 미확정** → **별도 IR(D)**: `IR-O4O-STORE-ORDER-LEDGER-CROSSSERVICE-AUDIT-V1` + `IR-O4O-SUPPLIER-ORDER-VISIBILITY-CROSSSERVICE-AUDIT-V1`. 공통화 전 가장 큰 미지수 축.

## 10. Phase 6 — 신청/승인(b2b hub) 흐름 비교

| 서비스 | b2b hub 컴포넌트 | 기반 | 판정 |
|--------|------------------|------|:---:|
| KPA | `HubB2BCatalogPage`(`pages/pharmacy/`) | SPO→ProductApproval→OPL | C |
| GP | `HubB2BCatalogPage`(`pages/hub/`, 별도 파일) | 동일 흐름(추정) | C |
| KCos | `HubB2BPage`(`pages/hub/`) | 동일 흐름(추정) | C |

> my-products(OPL) 가 공통 패키지이므로 **승인 후 산출물(OPL)은 정합**. 단 b2b **카탈로그/신청 UI 는 3별도 컴포넌트**(이름도 KCos 만 상이) → 신청→승인→OPL 생성·`is_active` 초기값·PENDING 라벨 parity 확인 필요(C). 신청≠주문 원칙은 OPL 공통 컴포넌트로 보장.

---

## 11. Phase 7 — 공통화 가능성 판정

| 영역 | KPA | GP | KCos | 판정 | 근거 |
|------|:---:|:---:|:---:|:---:|------|
| **my-products (OPL)** | ✅ | ✅ | ✅ | **A 이미 공통** | `@o4o/store-products-ui` 단일 컴포넌트 |
| **local-products (StoreLocalProduct)** | dup | dup | dup | **B 추출 후보** | 동일 타입+동일 백엔드, page/client 3중복 |
| **event-offers (EventOffer)** | 별도 | 별도 | 별도 | **C parity 후** | cart 흐름 일관, 컴포넌트 3별도 |
| **b2b hub (신청/승인)** | 별도 | 별도 | 별도 | **C parity 후** | OPL 산출물 정합, 카탈로그 UI 3별도 |
| **orders (checkout_orders)** | checkout 확인 | 미확인 | 미확인 | **D 별도 IR** | GP/KCos 원장 기반 미확정 |
| **supplier order visibility** | — | — | — | **D 별도 IR** | 본 IR 미조사 |

**종합 판정 = B/C 혼합** (사용자 예측 부합). my-products 는 완료(A); local-products 는 바로 추출 가능(B); event-offers·b2b 는 parity 확인 후 추출(C); orders·supplier 가시성은 추가 IR 선행(D).

---

## 12. Phase 8 — 후속 작업 분리

**바로 가능 (B)**
- `WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V1` — 3 `StoreLocalProductsPage` + localProducts client 를 service-neutral 공통 컴포넌트/훅으로 추출(서비스별 BASE·문맥 라벨 prop). 동일 타입·동일 모델이라 저위험.

**parity 확인 후 (C)**
- `WO-O4O-STORE-HUB-EVENT-OFFER-CROSSSERVICE-PARITY-V1` — 3 event-offer 페이지 종료차단·cart·표시 parity 후 공통화.
- `WO-O4O-STORE-HUB-B2B-CATALOG-CROSSSERVICE-PARITY-V1` — b2b 카탈로그/신청 UI parity(KCos `HubB2BPage` 명칭 포함).

**추가 IR 선행 (D)**
- `IR-O4O-STORE-ORDER-LEDGER-CROSSSERVICE-AUDIT-V1` — GP/KCos `commerce/orders` 원장(checkout_orders vs legacy)·결제상태 기준.
- `IR-O4O-SUPPLIER-ORDER-VISIBILITY-CROSSSERVICE-AUDIT-V1` — paid 이후 공급자 통합 리스트 노출·pending 비노출.

**권장 순서**: ① local-products 추출(B, 저위험) → ② order-ledger IR(D) → ③ event-offers/b2b parity(C) → ④ supplier-visibility IR(D) → ⑤ 전면 공통 컴포넌트 추출.

---

## 13. 결론
- **my-products(O4O 주문 가능 상품)는 이미 `@o4o/store-products-ui` 로 3서비스 공통화 완료(A)** — Phase 6 의 핵심 축은 이미 닫혀 있다.
- **local-products(매장 취급 상품)는 동일 모델·동일 타입의 3중복**으로, **바로 공통 컴포넌트 추출 가능(B)**.
- **event-offers·b2b hub 는 흐름은 정합하나 컴포넌트가 3별도**라 **parity 확인 후 공통화(C)**.
- **orders·supplier order visibility 는 GP/KCos 원장 기반이 미확정**이라 **추가 IR 선행(D)** — 공통화 전 최대 미지수.
- 종합 = **B/C 혼합**. "바로 전면 공통화"는 아니며, **local-products 추출(B) 먼저 + 주문/공급자 축 별도 IR(D)** 가 안전한 진입점.

---

*Date: 2026-06-12 · read-only IR · 코드 무변경 · 판정 B/C 혼합: my-products 공통완료(A) / local-products 추출후보(B) / event-offers·b2b parity(C) / orders·supplier 별도 IR(D).*
