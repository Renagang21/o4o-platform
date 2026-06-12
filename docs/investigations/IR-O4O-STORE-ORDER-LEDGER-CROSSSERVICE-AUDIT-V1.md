# IR-O4O-STORE-ORDER-LEDGER-CROSSSERVICE-AUDIT-V1

> **유형**: Investigation (read-only) — KPA/GP/KCos 내 매장 주문 내역의 **주문 원장** cross-service 조사.
> **성격**: 코드/DB/migration/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **판정 C** — **3서비스 backend 주문 원장은 `checkout_orders` 로 이미 통일**(legacy 미혼입). 단 **GP 주문 내역 페이지만 deprecated stub(`/glycopharm/pharmacy/orders`, 빈 배열)을 호출**해 실제 `checkout_orders`(`/glycopharm/checkout/orders`)를 읽지 않는다. → backend 동일·UI 공통화 가능하나 **GP 페이지 stub repoint 선행 필요**.
> **선행**: `IR-O4O-MY-STORE-COMMONIZATION-PHASE6-GP-KCOS-APPLICATION-SCOPE-V1`(orders=D).
> **작성일**: 2026-06-12

---

## 1. 목적
KPA/GP/KCos 의 `/store/commerce/orders`(주문 내역)가 실제로 어떤 원장(`checkout_orders` vs legacy)을 쓰는지 확정하고, 주문 화면 공통화 가능성을 판정한다.

## 2. 배경
선행 Phase 6 IR 에서 `orders` 는 KPA 만 checkout 확인, GP/KCos 미확정으로 **D(별도 IR)** 분류. 본 IR 이 그 확정.

## 3. 선행 기준
StoreLocalProduct(매장 취급 상품)·유통참여형 펀딩(Neture-only)은 Store 주문 원장에 포함되면 안 된다. 이벤트 오퍼는 checkout_orders 에 포함될 수 있다.

## 4. 조사 범위
3서비스 주문 페이지 컴포넌트 → API client → backend controller → 원장 entity/table. (read-only.)

---

## 5. Phase 1 — 주문 화면 route/component/API 매핑

| 서비스 | 페이지 컴포넌트 | API client | backend endpoint | backend controller | 원장 |
|--------|----------------|-----------|------------------|--------------------|------|
| KPA | `StoreOrdersPage`(`pages/pharmacy/`) | `api/checkout` `getStoreOrders` | `/checkout/store-orders` | `kpa-checkout.controller.ts` | **checkout_orders** |
| GP | `PharmacyOrders`(`pages/store-management/`) | `api/pharmacy` `pharmacyApi.getOrders` | **`/glycopharm/pharmacy/orders`** | `pharmacy.controller.ts:164` | **STUB(빈 배열)** |
| KCos | `StoreOrdersPage`(`pages/store/`) | `api/storeOrders` `getStoreOrders` | `/cosmetics/orders` | `cosmetics-order.controller.ts` | **checkout_orders** |

> **GP 별도 endpoint 존재**: `pharmacy.controller.ts:164` `GET /pharmacy/orders` 는 주석대로 **"Phase 4-A: Legacy Order System Deprecated. Returns empty data until E-commerce Core integration"** — `{ items: [], total: 0 }` 고정 반환 + `_notice: 'Order system migration in progress'`. 그러나 GP 에는 **실제 원장 endpoint `GET /glycopharm/checkout/orders`(`checkout.controller.ts:607`)** 가 따로 존재한다. → GP 주문 페이지가 **잘못된(stub) endpoint** 를 호출 중.

---

## 6. Phase 2 — 주문 원장 확인

| 서비스 | 원장 entity | table | legacy 혼입 | 정렬 근거 |
|--------|------------|-------|:---:|-----------|
| KPA | `CheckoutOrder` | `checkout_orders` | 없음 | `kpa-checkout.controller.ts:25-29,142` `createCheckoutOrder` |
| GP | `CheckoutOrder` | `checkout_orders` | 없음(ecommerce_orders 미존재) | `checkout.controller.ts:28-36` "WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1: canonical 주문 원장 = checkout_orders, create/list/get 를 CheckoutOrder 기준 정렬" |
| KCos | `CheckoutOrder` | `checkout_orders` | 없음(ecommerce_orders 미존재) | `cosmetics-order.controller.ts:20-27` "canonical checkout_orders 정렬, list/get 은 이미 checkout_orders raw SQL" |

> **3서비스 backend 주문 원장 = `checkout_orders` 단일 통일.** `WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1` 으로 GP/KCos 가 canonical 정렬됨. legacy(ecommerce_orders/service-specific) **미존재/미혼입**. items 는 `CheckoutOrder` jsonb 인라인.

## 7. Phase 3 — 상태값 기준 비교

| 축 | KPA | GlycoPharm | K-Cosmetics | 비고 |
|----|-----|-----------|-------------|------|
| 원장 상태 | `CheckoutOrderStatus`(공통 enum) | 동일 | 동일 | DB 레벨 통일 |
| frontend 표시 타입 | `status: string` + `paymentStatus: string`(`api/checkout`) | (stub — 미표시) | `OrderStatus`=`created/pending_payment/paid/cancelled/refunded`(typed) | **frontend 라벨 매핑 상이** |

> 원장 상태는 `CheckoutOrderStatus` 로 통일. frontend 표시 매핑만 서비스별 상이(KPA 느슨한 string, KCos typed enum, GP 미표시). → 공통화 시 **상태 라벨 매핑 정렬(소) 필요**.

## 8. Phase 4 — 주문 유형별 포함 여부

| 유형 | checkout_orders 포함 | 정합 |
|------|:---:|:---:|
| 기본 O4O 주문 가능 상품(OPL) | ✅ (cart `/store/cart/{serviceKey}/checkout-confirm` → CheckoutOrder) | ✅ |
| 이벤트 오퍼(EventOffer) | ✅ (`event-offer.service.ts:642` `checkoutService.createOrder`) | ✅ |
| 매장 취급 상품(StoreLocalProduct) | ❌ (주문 무관) | ✅(미포함이 정상) |
| 유통참여형 펀딩(Market Trial) | ❌ (Neture-only, 신규 전환 비활성) | ✅(미포함이 정상) |

> 이벤트 오퍼 주문도 **동일 `checkout_orders`** 에 적재(공통 `checkoutService.createOrder`). StoreLocalProduct·펀딩은 원장 미포함(정책 정합).

## 9. Phase 5 — cart/checkout 연결

| 서비스 | cart 흐름 | 생성 API | 원장 생성 |
|--------|-----------|----------|-----------|
| 3서비스 공통 | `/store-hub/cart` | `/store/cart/{serviceKey}/checkout-confirm`(`storeCart.ts:142`) | `checkout_orders`(CheckoutOrder) |

> cart/checkout 생성 경로는 **serviceKey 파라미터화된 공통 흐름**. 즉 **주문 생성은 이미 3서비스 공통 원장**으로 들어간다. GP 도 생성은 checkout_orders 에 적재되나 **GP 주문 내역 READ 만 stub** 이라 사용자에게 빈 목록으로 보임.

---

## 10. Phase 6 — 주문 원장 공통화 가능성

| 영역 | KPA | GlycoPharm | KCos | 판정 |
|------|:---:|:---:|:---:|:---:|
| backend 원장(checkout_orders) | ✅ | ✅ | ✅ | **A 통일** |
| 주문 생성(cart→checkout) | ✅ | ✅ | ✅ | **A 공통** |
| 주문 내역 READ 배선 | ✅ | ❌(stub) | ✅ | **C (GP repoint 필요)** |
| frontend 상태 라벨 매핑 | string | (미표시) | typed | **B (정렬 소)** |
| 주문 화면 컴포넌트 | 3별도 | 3별도 | 3별도 | **C (추출 후보)** |

> **종합 = C.** backend 원장·생성은 이미 통일(A)이라 UI 공통화는 가능. 단 **GP 주문 페이지 stub→checkout 원장 repoint 선행**(C) + 상태 라벨 매핑 정렬(B) 후 공통 컴포넌트 추출.

---

## 11. Phase 7 — 후속 작업 분리

**선행 (C — GP 배선 정정)**
- `WO-O4O-GLYCOPHARM-ORDERS-PAGE-CHECKOUT-LEDGER-REPOINT-V1` — GP `PharmacyOrders` 를 stub `/glycopharm/pharmacy/orders` → 실제 `/glycopharm/checkout/orders`(checkout_orders) 로 repoint. (deprecated stub 정리 포함. 실데이터 존재 여부 배포 후 확인.)

**상태 정렬 (B)**
- `WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1` — KPA(string)/KCos(typed)/GP 주문 상태·결제 상태 표시 라벨 공통 매핑.

**공통화 (C 후속)**
- `WO-O4O-STORE-ORDERS-COMMON-COMPONENT-EXTRACTION-V1` — GP repoint + 라벨 정렬 후 주문 내역 화면 공통 컴포넌트 추출(serviceKey/endpoint prop).

**추가 IR (D)**
- `IR-O4O-SUPPLIER-ORDER-VISIBILITY-CROSSSERVICE-AUDIT-V1` — paid 이후 공급자 통합 주문 리스트 노출·pending 비노출(본 IR 미조사 — 매장 측만 다룸).

**권장 순서**: ① GP repoint(C) → ② 상태 라벨 정렬(B) → ③ 주문 화면 공통 추출 → ④ supplier-visibility IR(D).

---

## 12. 결론
- **3서비스 backend 주문 원장 = `checkout_orders` 단일 통일**(legacy 미혼입). 주문 생성(cart→`checkout-confirm`)·이벤트 오퍼 주문 모두 동일 원장. `WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1` 로 GP/KCos canonical 정렬됨.
- **GP 주문 내역 페이지만 deprecated stub(`/glycopharm/pharmacy/orders`, 빈 배열)을 호출** — 실제 `/glycopharm/checkout/orders` 미사용. 사용자에게 GP 주문 내역이 비어 보이는 **배선 결함**.
- StoreLocalProduct·유통참여형 펀딩은 원장 미포함(정책 정합), 이벤트 오퍼는 포함(정합).
- **판정 C**: backend 원장 동일 → UI 공통화 가능. 단 **GP stub repoint(선행) + 상태 라벨 정렬(소)** 후 주문 화면 공통 컴포넌트 추출. supplier 가시성은 별도 IR(D).

---

*Date: 2026-06-12 · read-only IR · 코드 무변경 · 판정 C: backend 원장 checkout_orders 통일 / GP 주문페이지 stub repoint 선행 / 상태 라벨 정렬(B) 후 UI 공통화. supplier visibility 별도 IR.*
