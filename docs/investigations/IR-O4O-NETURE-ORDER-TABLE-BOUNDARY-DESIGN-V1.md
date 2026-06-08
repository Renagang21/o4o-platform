# IR-O4O-NETURE-ORDER-TABLE-BOUNDARY-DESIGN-V1

> **조사 전용 (read-only).** 코드/DB/API/UI/route 수정 없음. `neture_orders` 와 `checkout_orders` 의 역할 경계를 실측하고, 이벤트 오퍼 주문 통합·공급자 fulfillment workspace·배송비 계산 V2의 기준 테이블을 결정한다.

- **작성일**: 2026-06-05
- **작업 유형**: Investigation (IR) — 설계 판단
- **선행**: `IR-O4O-NETURE-SUPPLIER-ORDER-FULFILLMENT-WORKSPACE-DESIGN-V1`, `ORDER-WORKSPACE-IA-LINK-V1`
- **계약 근거**: `CLAUDE.md §4 E-commerce Core` (`checkoutService.createOrder()` 필수 / `*_orders` 신규 생성 금지), `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`

---

## 1. 요약 판정

**near-term: 역할 분리 유지(C) + 배송비 V2는 주문 생성 지점에 정책 적용. long-term: checkout_orders canonical(A) 지향(거버넌스 결정 필요).**

| 핵심 사실 | 결과 |
|-----------|------|
| `neture_orders` | Neture **공급자 fulfillment 원장** — 상태전이·송장(neture_shipments)·정산(neture_settlement) 모두 여기 기반. `shipping_fee` 보유(≥5만 무료/else 3000) |
| `checkout_orders` | **결제·서비스/이벤트오퍼 주문 원장**(Toss). order-level `supplierId` 보유, `shippingFee` order-level이나 **0 하드코딩**(계산 없음), **공급자 fulfillment API 없음** |
| 이벤트 오퍼 주문 | **checkout_orders에만** 적재(`checkoutService.createOrder()`), serviceKey 태깅, supplierId=product.supplier_id. neture_orders 미포함 → **공급자 workspace에서 안 보임** |
| 공급자 workspace 기준 | **neture_orders** (`supplier-order.controller`, SPO.supplier_id 필터) |
| 배송비 V2 적용 위치 | **두 createOrder 경로 모두**: `checkout.service`(이벤트/서비스, 현재 0) + `neture.service`(현재 3000/free) → 공통 supplier shipping policy로 |
| 물리 통합 | **불필요/위험** — 정산·결제·상태머신이 달라 near-term 통합은 RISK |

**권장(요지):** 두 원장을 합치지 말 것. ① 공급자가 이벤트 오퍼 주문도 보게 하려면 **checkout_orders를 supplierId로 aggregator 조회(C)** 가 migration 0·최저위험. ② **배송비 V2는 주문 boundary 결정과 분리** 가능 — 두 생성 경로에 공통 shipping policy 적용. ③ 이벤트 오퍼 주문의 실제 송장/상태/정산이 필요해지면 **checkout→neture fulfillment 동기화(B)** 로 승급. ④ `checkout_orders canonical(A)` 는 E-Commerce Order Contract와 정합하나 fulfillment 재작업이 크므로 **별도 거버넌스 WO**.

---

## 2. neture_orders 구조

- 엔티티: `apps/api-server/src/routes/neture/entities/neture-order.entity.ts` / `neture-order-item.entity.ts`
- **주문 원장 성격**: Neture 자체 공급 주문(B2B 매장 입고 `STORE_RESTOCK` / 고객 직배송 `DIRECT_TO_CUSTOMER`).
- 주요 컬럼: id, order_number, user_id(buyer/store), **status**(created/pending_payment/paid/preparing/shipped/delivered/cancelled/refunded), total_amount, discount_amount, **shipping_fee(int, 기본0)**, final_amount, payment_method/payment_key/paid_at, shipping(jsonb 주소), order_type, customer_info, cancelled_at/cancel_reason.
- item: `neture_order_items` — **product_id = SupplierProductOffer.id(SPO)** → supplier는 `spo.supplier_id`로 역추적. unit_price/total_price 스냅샷. (item-level supplier_id 없음)
- 송장: **`neture_shipments`**(order_id, supplier_id, carrier_code/name, tracking_number, status preparing→shipped→in_transit→delivered).
- **생성 경로**: `neture.service.createOrder()` — SPO 6-gate 검증 후 atomic save. **배송비**: `shippingFee = total>=50000 ? 0 : 3000`(고정식).
- **정산**: `neture_settlement`(+`neture_settlement_orders`) — `status='delivered'` neture_orders 집계, platform_fee 10%. 파트너 커미션 자동 생성.
- **이벤트 오퍼**: ❌ neture_orders로 들어오지 않음.

> 근거: neture-order.entity.ts:86-182, neture.service.ts:500-678(생성·배송비617-618), supplier-order.controller.ts, neture_shipments migration, neture-settlement.service.ts:138-150.

---

## 3. checkout_orders 구조

- 엔티티: `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` (+ `CheckoutPayment`, `OrderLog`). **item 전용 테이블 없음 — `items` jsonb 배열**.
- **주문 원장 성격**: e-commerce 결제/주문 원장(Toss). KPA/GlycoPharm/K-Cosmetics 서비스 주문 + **이벤트 오퍼 주문**.
- 주요 컬럼: id, order_number, buyerId, sellerId, **supplierId(order-level, varchar)**, **sellerOrganizationId(매장 단위 추적)**, partnerId, subtotal, **shippingFee(decimal, 기본 0)**, discount, totalAmount, **status**(CREATED/PENDING_PAYMENT/PAID/REFUNDED/CANCELLED), **paymentStatus**(PENDING/PAID/FAILED/REFUNDED), shippingAddress(jsonb), **items(jsonb: productId/name/qty/unitPrice/subtotal — shippingFee·supplierId 없음)**, metadata(serviceKey 등), paidAt/refundedAt/cancelledAt.
- **생성**: `checkout.service.createOrder()` — **`const shippingFee = 0;`(하드코딩, line~121)**, order_type/service_key는 호출자 metadata로. → 배송비 계산 **부재**.
- **결제**: `checkout_payments`(Toss paymentKey). `checkout_order_logs` 상태 감사.
- **공급자 fulfillment API**: ❌ checkout_orders 대상 상태변경/송장 API 없음.

> 근거: CheckoutOrder.entity.ts:54-207(shippingFee 110-111), checkout.service.ts:117-167(shippingFee=0 121), checkoutController.ts, kpa-checkout.controller.ts.

---

## 4. 이벤트 오퍼 주문 흐름

- `event-offer.service.participate()` (`routes/kpa/services/event-offer.service.ts:546-755`):
  1. 리스팅/공급자 상품 검증 → 2. 수량 게이트(per_order/per_store/total, SELECT FOR UPDATE) → 3. **`checkoutService.createOrder({ buyerId, sellerId=org_id, supplierId=product.supplier_id, items:[{productId=offer_id, unitPrice=eventPrice ?? price_general, ...}], metadata:{serviceKey, productListingId, ...} })`** → 4. 실패 시 수량 보상 → 5. 매장 진열 자동 링크.
- 대상 서비스: KPA(`kpa`)·K-Cosmetics(`k-cosmetics-event-offer`)·GlycoPharm(`glycopharm-event-offer`). **Neture 자체 미적용**.
- 가격 snapshot: items.unitPrice에 event price 또는 price_general 저장(별도 snapshot 컬럼 없음).
- **공급자 workspace 노출**: ❌ 현재 불가(workspace는 neture_orders만 읽음). 단 checkout_orders에 **order-level supplierId 존재** → aggregator 조회는 가능.
- **neture_orders로 전환/동기화**: 현재 없음.

---

## 5. Neture 일반 공급 주문 흐름

- 일반 Neture 공급 주문 = **neture_orders** (`neture.service.createOrder` → SPO 기반). checkout_orders 미경유.
- 즉 **공급자 fulfillment의 실제 원장 = neture_orders**. checkout_orders와 이중 생성되는 경로는 발견되지 않음(서로 다른 진입: Neture 셀러 주문 vs 이벤트오퍼/서비스 결제).

---

## 6. 배송비 계산 위치

| 원장 | shippingFee | 계산 |
|------|-------------|------|
| neture_orders | int, order-level | **있음**(고정식 `>=50000?0:3000`, neture.service.ts:617) |
| checkout_orders | decimal, order-level | **없음**(`=0` 하드코딩, checkout.service.ts:121) |

- **배송비 V2(공급자 shipping policy: base_shipping_fee/free_shipping_threshold) 적용 지점**: 주문 **생성 시점**.
  - 이벤트/서비스 주문 → `checkout.service.createOrder` (현재 0 → 정책 계산으로 교체).
  - Neture 공급 주문 → `neture.service.createOrder` (현재 고정식 → 정책 계산으로 교체).
- **중복 계산 회피**: 두 원장이 분리 생성되므로 각 createOrder에서 1회씩 계산하면 중복 없음. 공통 `shipping-policy` 계산 모듈로 단일화 권장.
- supplier shipping policy 필드(base_shipping_fee/free_shipping_threshold)의 **현재 저장처는 미확인 → 배송비 V2 WO 선행 조사 항목**.

---

## 7. 정산/상태/송장 영향

- **정산 기준**: `neture_settlement` = neture_orders(`delivered`). checkout_orders는 `checkout_payments`(Toss 결제)만 — **정산 집계 미연결**(GlycoPharm billing_invoice는 별도). → 이벤트 오퍼 주문 정산은 현재 **공백(GAP)**.
- **상태/송장**: 상태전이·`neture_shipments` 모두 neture_orders 전용. checkout_orders는 payment status 중심, 배송 상태/송장 **없음**.
- **함의**: 이벤트 오퍼 주문에 "배송준비/송장/배송완료/정산"을 주려면 checkout_orders만으로는 불가 → fulfillment record(neture_orders 계열) 필요(B) 또는 checkout_orders에 fulfillment 필드 신설(A의 일부).

---

## 8. 후보 A~D 비교

| 기준 | A. checkout canonical | B. neture fulfillment + 이벤트오퍼 동기화 | C. 분리 유지 + aggregator 조회 | D. 분리 유지 + 이벤트오퍼 별도 workspace |
|------|---|---|---|---|
| 공급자 UX(한 곳) | 높음 | 높음 | 높음(읽기 통합) | 낮음(분산) |
| 구현 난이도 | **높음**(fulfillment/송장/정산 재작성) | 중(동기화 1방향) | **낮음**(읽기 aggregator, migration 0) | 낮음 |
| 기존 workspace 재사용 | 낮음(neture 기반 폐기) | 높음 | 높음(읽기만 추가) | 중 |
| 이벤트오퍼 정합 | 높음(이미 checkout) | 중(전환 시점/정합 관리) | 중(상태/송장은 source별) | 중 |
| 배송비 V2 적합 | 높음(checkout 1곳) | 중(두 곳) | 중(두 곳) | 중 |
| 정산 영향 | 큼(정산 재정의) | 중(동기화분 정산) | 중(정산은 neture만) | 중 |
| 데이터 중복 위험 | 낮음(단일) | **있음**(이중 원장) | 낮음(통합 안 함) | 낮음 |
| 단계적 확장성 | 낮음(빅뱅) | 중 | **높음**(V1 읽기→V2 동기화) | 중 |
| **계약 정합(CLAUDE.md §4)** | **높음**(checkoutService canonical) | 중 | 중 | 중 |

---

## 9. 권장 설계안

**단계적: C(near-term) → 필요시 B(승급) / A(long-term 거버넌스).**

1. **near-term — 공급자 주문 통합 "읽기"**: 공급자 workspace가 **neture_orders + checkout_orders(supplierId 필터)** 를 함께 조회(aggregator). migration 0, 상태변경은 source별 API. 이벤트 오퍼 주문이 공급자에게 최소한 "보이게".
2. **배송비 V2(주문 boundary와 독립)**: 공통 supplier shipping policy 계산 모듈 도입 → `checkout.service.createOrder`(0 제거) + `neture.service.createOrder`(고정식 제거) 양쪽 적용. 두 원장 분리여도 각 1회 계산이라 중복 없음.
3. **필요 시 B 승급**: 이벤트 오퍼 주문에 실제 송장/상태/정산이 요구되면 `checkout_orders → neture fulfillment record` **단방향 동기화**(생성 시 fulfillment row 생성). 이중 원장 정합 가드 필수.
4. **long-term A(거버넌스)**: E-Commerce Order Contract(`checkoutService.createOrder()` canonical, `*_orders` 신규 금지)와 정합하려면 checkout_orders를 canonical로, neture_orders를 fulfillment view로 수렴. 단 fulfillment·정산 재작성 大 → **별도 거버넌스 IR/WO 결정 사항**(본 IR 범위 밖).

---

## 10. 후속 구현 순서

```text
판정: C(near-term) + 배송비 V2 분리

1) WO-O4O-NETURE-SUPPLIER-SHIPPING-CALCULATION-V2
   - supplier shipping policy 저장처 선행 조사 → 공통 계산 모듈 → checkout/neture createOrder 양쪽 적용
   - (배송비 V2는 order boundary 최종 결정 전에도 안전하게 진행 가능)
2) WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 (Candidate C)
   - 공급자 workspace에서 neture_orders + checkout_orders(supplierId) 읽기 통합. migration 0.
3) (조건부) WO-O4O-NETURE-EVENT-OFFER-CHECKOUT-TO-NETURE-ORDER-SYNC-V1 (Candidate B)
   - 이벤트 오퍼 주문 fulfillment(송장/상태/정산) 필요 확정 시.
4) (거버넌스) IR/WO-O4O-CHECKOUT-ORDER-CANONICAL-CONVERGENCE (Candidate A) — E-Commerce Order Contract 정합 장기.
```

---

## 11. 이번 IR에서 수정하지 않은 것
주문 테이블/엔티티/migration, 동기화 로직, shippingFee 계산, supplier workspace 통합 구현, 상태변경/송장 API, 정산/환불/event offer/checkout service 로직 — **전부 무수정**. 다른 세션 WIP 무접촉.

---

### Evidence
- neture: `routes/neture/entities/neture-order.entity.ts`, `routes/neture/services/neture.service.ts:500-678`, `modules/neture/controllers/supplier-order.controller.ts`, `modules/neture/services/neture-settlement.service.ts`, `database/migrations/*CreateNetureShipmentsTable*`
- checkout: `entities/checkout/CheckoutOrder.entity.ts`, `services/checkout.service.ts:117-167`, `controllers/checkout/checkoutController.ts`, `routes/kpa/controllers/kpa-checkout.controller.ts`
- event offer: `routes/kpa/services/event-offer.service.ts:546-755`
- 계약: `CLAUDE.md §4`, `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`

*조사 전용. 코드/문구/라우트/DB 변경 없음.*
