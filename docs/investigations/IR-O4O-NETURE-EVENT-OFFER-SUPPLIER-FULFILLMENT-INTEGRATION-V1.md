# IR-O4O-NETURE-EVENT-OFFER-SUPPLIER-FULFILLMENT-INTEGRATION-V1

> **유형**: Investigation (조사 전용 — 코드/DB/API/UI/route 변경 없음)
> **일자**: 2026-06-08
> **목적**: 이벤트 오퍼 주문(`checkout_orders`)을 공급자 fulfillment·배송·정산(`neture_orders` 기반) 흐름에 어떻게 편입할지 read-only 설계.
> **전제**: 이벤트 오퍼 = 공급자가 이벤트 조건으로 제안하고 매장이 주문하는 **공급 활동** → 공급자가 실제 배송 처리 대상.
> **선행**: ORDER-TABLE-BOUNDARY-DESIGN-V1, ORDER-UNIFIED-VIEW-V1, SHIPPING-CALCULATION-V2, FULFILLMENT-LEGACY-SCHEMA-FIX-V1

---

## 1. 요약 판정

**권장: 후보 B(이벤트오퍼 checkout_order → neture_order fulfillment record 생성) — 단, 2개의 선결조건을 분리한다.**

| 핵심 발견 | 결과 |
|-----------|------|
| 이벤트오퍼 주문 결제 라이프사이클 | 🔴 **'paid' 도달 경로 없음** — participate 후 결제 플로우 부재, CREATED/PENDING 영구 정체 (checkout.service.ts:150-151, event-offer.service.ts) |
| 정산 | 🔴 **checkout_orders 미참조** — neture_orders `status='delivered'` 기준만, fee 10% (neture-settlement.service.ts:139-160) → 이벤트오퍼 정산 **완전 공백** |
| 연결키 | 🟡 neture_orders **`metadata` jsonb 존재**(line 164) → link 저장은 migration 불필요. 단 **중복 방지 unique 보장은 컬럼+인덱스 필요**(migration) |
| product_id 매핑 | 🟢 양쪽 모두 **SPO id**(supplier_product_offers.id) → neture_order_items 표현 가능 |
| neture_order 생성 필수필드 | 🟢 user_id(=buyer) + order_number(생성) + order_type(default) → checkout 데이터로 충족 가능 |
| fulfillment workspace 재사용 | 🟢 status 전이·neture_shipments·detail 화면 그대로 재사용 가능 |

**판정 요지**: 후보 B 가 기존 fulfillment workspace·송장·정산 구조를 재사용할 수 있어 구조적으로 가장 적합하다. **그러나** ① 이벤트오퍼에 'paid' 상태가 없어 "결제 성공 후 동기화"(WO 선호 시점2)가 **성립하지 않으며**, ② 미결제 주문을 delivered 정산에 넣으면 **미수금 정산 위험**이 있다. 따라서 **V1은 fulfillment(배송/송장)까지만 동기화하고, 정산 편입은 결제·수금 모델 확정 후로 분리(DEFER)** 하는 단계화가 안전하다.

---

## 2. 이벤트 오퍼 주문 생성 흐름

`event-offer.service.ts:546-771 participate()` → `checkoutService.createOrder()`:
- payload: `buyerId=userId`, `sellerId=preListing.organization_id`, `supplierId=product.supplier_id`, `items:[{ productId=preListing.offer_id(=SPO id), productName, quantity, unitPrice=event_price ?? price_general, subtotal }]`, `shippingPolicy{base/free}`(SHIPPING-CALCULATION-V2), `metadata:{ serviceKey, productListingId, productName, productId }`.
- 생성 상태: **`status=CREATED`, `paymentStatus=PENDING`** (checkout.service.ts:150-151).
- 수량 게이트(per_order/per_store/total)는 SELECT FOR UPDATE 로 차감, 실패 시 보상.
- **결제 단계 없음**: participate 이후 Toss 결제 개시/완료·confirm/pay 엔드포인트 호출이 없음 → 주문은 CREATED/PENDING 으로 머무름. (event-offer.controller 에 결제 라우트 없음, checkoutService.completePayment 미호출)

> **GAP(핵심)**: 이벤트오퍼 주문은 현재 **결제 확정 상태가 없다.** "결제 성공" 트리거를 동기화 기준으로 쓸 수 없다.

---

## 3. checkout_orders 구조 (요지)
`CheckoutOrder.entity.ts` — id, orderNumber, buyerId, sellerId, **supplierId(varchar)**, sellerOrganizationId, subtotal, **shippingFee**, totalAmount, **status**(created/pending_payment/paid/refunded/cancelled), **paymentStatus**(pending/paid/failed/refunded), **items jsonb**(productId/productName/quantity/unitPrice/subtotal), **metadata jsonb**, paidAt/refundedAt/cancelledAt.
- fulfillment/송장 전용 필드 **없음**. 공급자 fulfillment API **없음**.
- 취소: `kpa-checkout.controller.ts:935-961` — CREATED/PENDING_PAYMENT 만 `status=cancelled`.
- 환불: `checkout.service.ts:314-378 refundOrder()` — `paymentStatus='paid'` 전제 → `status=refunded`,`paymentStatus=refunded`. (이벤트오퍼는 paid 가 안 되므로 환불 경로 사실상 미도달, 취소만 해당.)

---

## 4. neture_orders fulfillment 구조 (요지)
`neture-order.entity.ts:86-182` — user_id(필수), order_number(필수·생성), status(created→preparing→shipped→delivered…), total_amount/discount/shipping_fee/final_amount, payment_*, shipping jsonb, orderer_*, note(text), order_type(default STORE_RESTOCK), customer_info jsonb, **metadata jsonb(line 164)**, cancelled_at/cancel_reason.
- item: `neture_order_items`(**neture 스키마**) — **product_id=SPO id**, quantity, unit_price, total_price.
- 송장: `neture_shipments`(order_id, supplier_id, carrier, tracking, status).
- workspace: `/account/supplier/orders` + status 전이 API + shipment API (FULFILLMENT-LEGACY-SCHEMA-FIX-V1 로 정상화됨).
- **연결키**: source_order_id/external_ref 전용 컬럼 **없음**. `metadata` jsonb 로 `checkoutOrderId` 저장은 가능(무migration). 단 **unique 제약 불가** → 중복 방지엔 별도 컬럼+unique index(migration) 권장.

---

## 5. 통합 주문 보기와의 관계
`supplier-unified-order.service.ts` 는 neture_orders + checkout_orders 를 supplierId 로 **각각** 조회·병합.
- **RISK(중복 표시)**: 이벤트오퍼 checkout_order 를 neture_order 로 동기화하면 **같은 주문이 2행**(checkout_order + neture_order)으로 노출된다.
- **해소책(동기화 WO 포함 필수)**: neture_order.metadata.checkoutOrderId 가 있는 주문에 대응되는 checkout_order 행을 **unified 조회에서 숨김(dedup)** 하거나 단일 row 병합. → V1 동기화 WO 에 dedup 규칙 포함.

---

## 6. 정산/환불/취소 영향
- **정산 기준**: `neture-settlement.service.ts:139-160` — `neture_orders.status='delivered'` 미정산분 집계, **PLATFORM_FEE_RATE=0.10**, total_sales = `neture_order_items.total_price` 합(배송비 포함 여부: shipping_fee 는 final_amount 에는 있으나 total_sales 계산엔 items 만 → 배송비는 정산 fee 계산에서 제외). **checkout_orders 미참조.**
- **GAP**: 이벤트오퍼 주문은 정산에 전혀 안 잡힌다(원장이 다름).
- **🔴 RISK(미수금 정산)**: 이벤트오퍼는 'paid' 가 안 된다(§2). B 로 동기화하면 공급자가 fulfillment 로 delivered 처리 → 정산이 **결제·수금되지 않은 주문에 대해 공급자 지급액을 산출**하게 된다. **결제/수금 모델(선결제·인보이스·오프라인 송금) 확정 전에는 정산 편입 금지.**
- **취소**: checkout 취소(CREATED/PENDING)는 동기화 전이면 무해. 동기화 후 취소 시 대응 neture_order 를 cancelled 처리하는 정책 필요(아직 shipped 전이면 안전).

---

## 7. 배송비 계산과의 관계
- SHIPPING-CALCULATION-V2 로 이벤트오퍼 checkout_order 생성 시 **shippingFee 가 이미 snapshot 저장**됨.
- **원칙**: neture_order fulfillment record 생성 시 **checkout_order.shippingFee 를 그대로 복사**(snapshot), **재계산 금지**. event price 도 items[].unitPrice snapshot 사용, 원본 상품가 재참조·덮어쓰기 금지.
- 매핑: subtotal→total_amount, shippingFee→shipping_fee, total→final_amount.

---

## 8. 후보 A~D 비교

| 기준 | A. checkout 자체 fulfillment | B. checkout→neture_order 동기화 | C. unified view 에 checkout fulfillment action | D. 별도 bridge 테이블 |
|------|---|---|---|---|
| 기존 fulfillment workspace 재사용 | 낮음(신규) | **높음** | 낮음(신규 API) | 낮음 |
| 송장(neture_shipments) 재사용 | ✗ 신규 | **✓** | ✗ 신규 | ✗ |
| 정산(delivered) 재사용 | ✗ 재설계 | **✓**(편입 시) | ✗ | ✗ |
| product_id 매핑 | n/a | **✓ SPO id 호환** | n/a | 중 |
| 원장 중복 | 없음 | **있음**(dedup 필요) | 없음 | 신규 원장 1개 |
| migration | 큼(checkout fulfillment/송장 컬럼) | **중**(link 컬럼+unique) | 큼 | 큼(신규 테이블) |
| 정산 모델 영향 | 재설계 | 편입 가능(단 미수금 RISK) | 분기 지속 | 분기 지속 |
| 계약 정합(checkoutService canonical) | 높음 | 중 | 중 | 낮음 |
| 단계적 확장성 | 낮음 | **높음**(fulfillment→정산 분리 가능) | 중 | 낮음 |

---

## 9. 권장 설계안

**후보 B, 단계화(fulfillment 먼저 / 정산 분리).**

1. **V1 (동기화 — fulfillment 범위)**: 이벤트오퍼 checkout_order 가 **확정 시점**에 대응 `neture_order`(+items) **fulfillment record** 생성. 공급자는 기존 `/account/supplier/orders` 에서 배송 준비·송장·배송 완료 처리. 배송비/가격은 checkout snapshot 복사(재계산 없음). unified view dedup 적용.
2. **정산 편입은 DEFER**: 이벤트오퍼 'paid' 부재 + 미수금 정산 위험 → **결제·수금 모델 확정 IR** 선행 전까지 동기화된 neture_order 를 **정산 대상에서 제외**(예: metadata 플래그로 settlement 쿼리에서 배제, 또는 결제확정 전 settlement 미생성). 정산은 후속.
3. **취소 정책**: 동기화 전 취소 → 미생성. 동기화 후 shipped 이전 취소 → 대응 neture_order cancelled. shipped 이후 → 환불/회수 정책 별도(후속).

> 핵심: **fulfillment(배송 처리)와 settlement(정산)을 분리**한다. 배송 처리는 지금 안전하게 가능, 정산은 결제 모델 확정 후.

---

## 10. 동기화 시점 판단

| 시점 | 적합성 | 비고 |
|------|:----:|------|
| 1. checkout_order 생성 직후 | 🟡 현실적 | 이벤트오퍼는 paid 가 없으므로 **participate(주문 생성)=확정**으로 간주 가능. 단 즉시 취소분 처리 필요 |
| 2. 결제 성공 후 | 🔴 **불가** | 이벤트오퍼에 결제 성공 상태가 없음(§2) |
| 3. 운영자/공급자 수동 확정 | 🟢 안전 | 자동 중복 위험 최소. 공급자 업무 자동성↓ |

→ **권장: 시점 1(participate=확정) 또는 시점 3(명시적 confirm) 중, V1 은 시점 1 + 취소 가드.** WO 가 선호한 시점 2 는 **결제 모델이 없어 채택 불가** — 이 점이 본 IR 의 핵심 보정.
→ 대안: 이벤트오퍼에 **명시적 'confirmed/paid' 전이를 먼저 도입**(별도 WO)하면 시점 2 가 부활하나, 이는 결제 모델 설계와 묶임 → §12 후속.

---

## 11. 연결키 / 중복 방지 설계

- **연결키 저장**: `neture_orders.metadata.checkoutOrderId = checkout_order.id` (무migration 가능). 매핑: checkout.id→metadata.checkoutOrderId, supplierId→supplier_id, buyerId→user_id, items→neture_order_items(product_id=SPO id), subtotal→total_amount, shippingFee→shipping_fee, total→final_amount, serviceKey→metadata.serviceKey.
- **중복 방지(권장)**: metadata jsonb 는 unique 제약 불가 → 신뢰 가능한 dedup 위해 **`source_order_id uuid` 컬럼 + partial unique index** 추가(이것이 V1 동기화 WO 가 요하는 **유일한 migration**). 생성 전 `WHERE source_order_id = $checkoutId` 존재 확인 + unique index 이중 방어.
- **원칙**: 동일 checkout_order → neture_order fulfillment record **정확히 1개**.

---

## 12. 후속 구현 WO 제안

1. **(1순위) WO-O4O-NETURE-EVENT-OFFER-CHECKOUT-TO-NETURE-ORDER-SYNC-V1** — 후보 B, **fulfillment 범위만**. 확정 시점에 neture_order fulfillment record 생성(source_order_id 컬럼 migration + unique), 배송비/가격 snapshot 복사, unified view dedup, 취소 가드. **정산 제외 플래그 포함.**
2. **(2순위·선결) IR-O4O-NETURE-EVENT-OFFER-PAYMENT-AND-SETTLEMENT-MODEL-V1** — 이벤트오퍼의 결제·수금 모델(선결제 vs 인보이스 vs 오프라인) 확정 → 정산 편입 가능 시점/조건 설계. **§6 미수금 정산 RISK 해소 전제.**
3. **(3순위·조건부) WO-O4O-NETURE-EVENT-OFFER-SETTLEMENT-ENABLE-V1** — 2순위 결과에 따라 동기화된 neture_order 를 정산 대상에 편입.
4. (대안) checkout 자체 fulfillment(후보 A)·bridge table(후보 D)은 본 IR 에서 **비권장**(재사용성·중복·정산 분기 비용).

---

## 13. 이번 IR에서 수정하지 않은 것
checkout_orders/neture_orders/order_items 엔티티·migration, sync 로직, fulfillment record 생성, 상태/송장/정산/환불/취소 로직, unified view, 배송비 계산, UI — **전부 무변경**. 다른 세션 WIP 무접촉. 문서만 작성.

---

### Evidence
- 생성: `routes/kpa/services/event-offer.service.ts:546-771`, `services/checkout.service.ts:117-167,150-151`
- checkout: `entities/checkout/CheckoutOrder.entity.ts`, 취소 `routes/kpa/controllers/kpa-checkout.controller.ts:935-961`, 환불 `services/checkout.service.ts:314-378`
- neture: `routes/neture/entities/neture-order.entity.ts:86-182`(metadata line 164), `neture-order-item.entity.ts`(product_id=SPO), `routes/neture/services/neture.service.ts:501-706`, `database/migrations/20260902500000-CreateNetureOrders.ts`
- 정산: `modules/neture/services/neture-settlement.service.ts:15-17,139-160`
- 통합: `modules/neture/services/supplier-unified-order.service.ts`

*조사 전용. 코드/스키마/라우트 변경 없음 — 후속 구현 범위 결정용.*
