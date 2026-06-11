# IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1

> **유형**: Investigation / Design IR (read-only)
> **목적**: O4O Store Order 의 payment / collection readiness 기준을 정의하고, 공급자 fulfillment·settlement guard 의 공통 기준을 마련한다.
> **상위 기준**: `IR-O4O-STORE-CART-PAYMENT-FULFILLMENT-STANDARD-COMMERCE-FLOW-V1`
> **성격**: 코드/DB/API/UI **무변경**. 조사·설계 문서만 작성.
> **작성일**: 2026-06-11

---

## 1. 요약 판정

| 질문 | 판정 |
|------|------|
| online 결제 주문의 payment readiness 기준이 있는가 | **있음** — `checkout_orders.paymentStatus='paid'` (+ `status='paid'`, `paidAt` not null). KPA handler fix 이후 KPA/Glyco/KCos 3 서비스 모두 신뢰 가능 |
| offline/operator collection readiness 모델이 있는가 | **없음 (GAP)** — `collectionStatus` 컬럼/개념 부재. neture_orders 도 별도 paymentStatus 컬럼 없음 |
| checkout-confirm(event_offer) 주문은 paid 인가 | **아니오 — `CREATED` + `paymentStatus=PENDING`** (결제 단계 미경유). **fulfillment/settlement 로 넘기면 미결제 주문이 처리됨 — CRITICAL** |
| fulfillment 시작에 payment gate 가 있는가 | **없음 — CRITICAL.** `supplier-order.service` 의 전이표가 `created→preparing` 과 `paid→preparing` 둘 다 허용 |
| settlement 에 payment readiness 필터가 있는가 | **없음 — RISK.** `WHERE o.status='delivered'` 만. paymentStatus/collection 미확인 |
| sourceType/pricingSource 가 readiness 기준으로 쓰이는가 | **아니오 (정상)** — readiness 판정에 source 분기 없음. (단 readiness 자체가 없어 분기할 것도 없음) |

**핵심 결론:**
1. **online 결제 주문**은 `paymentStatus='paid'` 가 신뢰 가능한 단일 readiness 기준이다. (3 서비스 핸들러 패턴 동일, KPA fix 완료)
2. **collection readiness(오프라인/운영자 확정) 모델은 존재하지 않는다.** 도입 필요.
3. **fulfillment·settlement guard 가 모두 부재**하다. 현재는 미결제·미수금 주문도 배송/정산될 수 있는 구조다. 다만 **현재는 checkout_orders 가 fulfillment(`canFulfill=false`)·settlement(쿼리에서 미참조) 양쪽에서 분리**되어 있어 실사고가 잠재화되어 있을 뿐, **bridge 를 만드는 순간 노출되는 CRITICAL 잠재 결함**이다.
4. 따라서 **fulfillment guard + settlement guard 가 bridge 보다 먼저** 구현되어야 한다.

---

## 2. 기준 원칙

```
O4O 의 차별점은 상품 출처(source)와 진열 방식이다.
장바구니 이후의 결제·배송·정산은 일반 전자상거래 원칙을 따라야 한다.

sourceType / pricingSource 는 상품 출처·가격 근거 metadata 일 뿐,
배송 가능 여부·정산 가능 여부의 기준이 아니다.

공급자 fulfillment 는 payment/collection readiness 확인 후 시작되어야 한다.
정산은 delivered + payment/collection readiness + 미취소/미환불 주문만 대상으로 한다.
```

이 원칙에 비추어 현재 구조의 GAP 을 §3~§9 에서 확정하고, §10~§14 에서 모델·guard 기준을 제안한다.

---

## 3. CheckoutOrder 상태 구조

**파일**: `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts`

| 항목 | 값 |
|------|------|
| `status` enum (`CheckoutOrderStatus`) | `created` / `pending_payment` / `paid` / `refunded` / `cancelled` (L24-30) |
| `paymentStatus` enum (`CheckoutPaymentStatus`) | `pending` / `paid` / `failed` / `refunded` (L35-40) |
| 시점 컬럼 | `paidAt` (L183) / `refundedAt` (L189) / `cancelledAt` (L195) 모두 존재 (nullable) |
| `items` | jsonb. line item 에 `metadata?: Record<string,any>` 존재 (L163-171) — Phase 1b 추가 |
| `supplierId` (varchar) / `sellerOrganizationId` (uuid, nullable) | 주문 단위 = 공급자(+판매 org). scalar (L83-92) |
| `shippingFee` (decimal) | 별도 컬럼 (L110) |

**createOrder 동작** (`checkout.service.ts` L140-197):
- 생성 시 `status=CREATED` (L167), `paymentStatus=PENDING` (L168).
- subtotal=Σ item.subtotal, shippingFee=snapshot 우선 / 없으면 `calculateSupplierShippingFee`.
- **자체 트랜잭션 없음, 재고 차감 없음** — 순수 주문 record 영속화.

**completePayment** (L232-298): payment 검증 성공 시 `status→PAID`, `paymentStatus→PAID`, `paidAt`, `paymentMethod` (L272-275). CheckoutPayment 행 `status→SUCCESS`.

**refundOrder** (L331-395): **전제 `paymentStatus=PAID`** (L345). → `status→REFUNDED`, `paymentStatus→REFUNDED`, `refundedAt`.

**cancelOrder**: `status→CANCELLED`, `cancelledAt`. paymentStatus 는 그대로(미결제 주문 취소 가정).

> **판정**: **payment readiness 의 신뢰 기준 = `paymentStatus='paid'`** (동치로 `status='paid'` + `paidAt` not null). refund/cancel 은 명확히 별 상태로 분리되어 있어 "정산 제외" 판정에 그대로 사용 가능.

---

## 4. CheckoutPayment / payment event 구조

**CheckoutPayment** (`entities/checkout/CheckoutPayment.entity.ts`): `orderId`(FK), `paymentKey`, `pgProvider`(default 'toss'), `amount`, `refundedAmount`, `status`(`CheckoutPaymentTransactionStatus`: pending/success/failed/refunded), `approvedAt/failedAt/refundedAt`. → 결제 거래의 SSOT 는 PaymentCore(o4o_payments) 및 이 행. CheckoutOrder.paymentStatus 는 그 **파생 요약**.

**PaymentEventHub** (`services/payment/PaymentEventHub.ts`):
- 이벤트: `payment.initiated/confirmed/completed/failed/cancelled` (L28-34).
- `PaymentCompletedEvent`: `paymentId, transactionId, orderId, paymentKey, paidAmount, paymentMethod, approvedAt, serviceKey?(라우팅 키), card?, ...` (L41-71).
- `subscribe(eventType, handler, serviceKey?)` — serviceKey 일치 시에만 핸들러 호출 (L122-143).
- `EventHubPaymentPublisher` 가 `sourceService → event.serviceKey` 로 매핑하여 발행.

**서비스별 핸들러** (모두 `payment.completed` → CheckoutOrder `status/paymentStatus=PAID, paidAt`; `payment.failed` → payable 상태 한정 `paymentStatus=FAILED`):

| 핸들러 | serviceKey | paid 전이 직전 sales_limit recheck |
|--------|:---------:|:---:|
| `GlycopharmPaymentEventHandler` | `glycopharm` | **있음** (`checkSalesLimitBeforePaid`, 초과 시 `status=CANCELLED/paymentStatus=FAILED`) |
| `KCosmeticsPaymentEventHandler` | `cosmetics` | 없음 |
| `KpaPaymentEventHandler` (신규) | `kpa` | 없음 (V1 제외 — 환불 함의) |
| `NeturePaymentEventHandler` | `neture` | — (NetureOrder 대상, CheckoutOrder 아님) |

> **판정**: `payment.completed` → `paymentStatus='paid'` 전이는 **online 결제 readiness 의 공통 기준으로 사용 가능**. 핸들러 패턴이 3 서비스 동일하고, serviceKey 라우팅이 결정적이다. (Glyco 만 recheck 추가 — readiness 기준 자체는 동일, 한도 hardening 의 유무 차이일 뿐.)

---

## 5. Store Cart checkout-confirm 주문 상태

**파일**: `services/cart/event-offer-cart-checkout.service.ts` (`confirm()` L109-331)
- cart item(`sourceType='event_offer'`) → `(supplierId, sellerOrganizationId)` 그룹 → 그룹별 `checkoutService.createOrder()` 호출.
- createOrder 기본값으로 **생성 주문 = `status=CREATED`, `paymentStatus=PENDING`**.
- **결제 단계를 전혀 거치지 않음** — cart→order record 생성까지만. metadata `{ source:'store_cart_checkout', serviceKey }`.

> **판정 (CRITICAL 전제)**: **checkout-confirm 주문은 "주문 record"이지 "결제 완료 주문"이 아니다.**
> 이 주문을 그대로 supplier fulfillment 로 넘기면 **미결제 주문이 배송/정산**된다.
> → fulfillment bridge V1 은 **반드시 `paymentStatus='paid'`(또는 collection confirmed) 주문만** 대상으로 해야 한다. pending checkout-confirm 주문은 bridge 금지.

---

## 6. KPA / Glyco / KCos online payment readiness

**KPA B2C** (`routes/kpa/controllers/kpa-checkout.controller.ts`, `kpa-payment.controller.ts`):
- `POST /checkout` → `createCheckoutOrder` → `status=CREATED, paymentStatus=PENDING`. 배송비 **고정 3000(delivery)/0(pickup)**. 주문 생성 시점 sales_limit `FOR UPDATE` 검증(`status='paid'` + `serviceKey IN ('kpa-society','kpa')` 누적).
- `prepare(sourceService='kpa')` → Toss → `confirm` → `payment.completed(serviceKey='kpa')` → `KpaPaymentEventHandler` → `paid`.

**Glyco / KCos**: 동일 패턴(CheckoutOrder + 서비스 핸들러로 paid 전이). Glyco 만 paid 직전 recheck.

> **판정**: KPA/Glyco/KCos online 결제 주문은 **`paymentStatus='paid'` 를 동일 readiness 기준으로 적용 가능**. (KPA fix 로 3 서비스 정합.)

---

## 7. Neture B2B / neture_orders legacy readiness 상태

**파일**: `routes/neture/entities/neture-order.entity.ts`, `routes/neture/services/neture.service.ts`, `modules/neture/services/supplier-order.service.ts`

- `neture_orders.status` enum: `created / pending_payment / paid / preparing / shipped / delivered / cancelled / refunded` (entity L23-32). 결제 추적은 `status` + `paid_at` + `payment_key` 로만. **별도 `paymentStatus`/`collectionStatus` 컬럼 없음.**
- createOrder 7 gate(product active/approved, supplier active, distribution, qty, price, inventory) — **결제/수금 확인 gate 없음**. `created` 로 생성.
- `NeturePaymentEventHandler`(serviceKey='neture') → `status=PAID, paid_at`.

> **판정**: neture_orders 는 **payment readiness 를 `status` 에 융합**(paid 가 상태값 중 하나)했고 collection 개념은 없다. readiness 모델을 도입하려면 **`status='paid'` 또는 `paid_at not null` 을 readiness 로 해석**할 수 있으나, 오프라인 수금(B2B 인보이스) 표현은 불가 → V2 에서 collection 모델로 수렴 필요. **즉시 변경 금지(legacy 운영 보호).**

---

## 8. Supplier fulfillment 시작 조건

**파일**: `modules/neture/services/supplier-order.service.ts` / `supplier-order.controller.ts`

```js
const SUPPLIER_STATUS_TRANSITIONS = {
  created:   ['preparing'],   // ← 미결제(created)도 preparing 허용
  paid:      ['preparing'],
  preparing: ['shipped'],
  shipped:   ['delivered'],
};
```
- `updateOrderStatus` / 컨트롤러는 위 전이표만 검사. **payment readiness 확인 없음 — CRITICAL GAP.**
- `createShipment`(L150-166): 중복 shipment 만 확인, 즉시 `neture_shipments` insert. **결제 확인 없음.**

**supplier-unified-order.service.ts** (`canFulfill`):
- neture_orders: **`canFulfill=true` 무조건** (L137).
- checkout_orders: **`canFulfill=false` 무조건** (L188), `readOnlyReason='이벤트 오퍼/서비스 주문은 checkout_orders 기반이며, 배송 처리 통합은 후속 작업'`.

> **판정**: **fulfillment readiness guard 는 (a) `supplier-order.service.updateOrderStatus`(created/paid→preparing 진입), (b) `createShipment`, (c) bridge 시 unified view 의 checkout_order `canFulfill` 계산** 에 적용해야 한다.
> 현재 checkout_orders 가 `canFulfill=false` 라 **buyer 결제 주문이 fulfillment 에서 분리**되어 있다(잠재화). neture_orders 의 `created→preparing` 무가드는 **legacy B2B 운영 흐름**이므로 V1 즉시 차단은 운영 파괴 위험 → V2.

---

## 9. Settlement 진입 조건

**파일**: `modules/neture/services/neture-settlement.service.ts` (`calculateSettlements` L139-217)

```sql
FROM neture_orders o
JOIN neture_order_items oi ON oi.order_id = o.id
JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
WHERE o.status = 'delivered'                       -- delivered 만
  AND o.updated_at >= $1 AND o.updated_at < $2+1d
  AND NOT EXISTS (... neture_settlement_orders nso WHERE nso.order_id=o.id)  -- 중복 정산 방지
GROUP BY spo.supplier_id HAVING SUM(oi.total_price) > 0
```
- **status='delivered' 만** 필터. **paymentStatus/collection 미확인.**
- 이미 정산된 주문 제외(junction unique).
- 수수료 10%(`PLATFORM_FEE_RATE=0.10`), **배송비 제외**(item total_price 합만).
- **checkout_orders 미참조** — 정산 쿼리는 neture_orders 전용. checkout_order-origin 주문 식별 불가.

> **판정 (RISK)**: 현재는 neture_orders 만 정산하고 checkout_orders 는 제외되어 있어 미결제 정산이 잠재화. 그러나 **bridge 로 checkout_order→neture_order(delivered) 가 생기면, payment readiness 필터가 없으므로 미결제 주문이 자동 정산됨.** → settlement guard 는 bridge 전 필수.

---

## 10. readiness 후보 A~E 비교

| 후보 | 내용 | 장점 | 단점 | 판정 |
|------|------|------|------|------|
| **A. paymentStatus 기준** | `paymentStatus='paid'` = ready | online 결제에 명확, 현 구조 그대로, KPA fix 후 신뢰 | offline/operator/인보이스 표현 불가, neture_orders 엔 컬럼 없음(`status='paid'` 로 대용) | **V1 채택** (online 한정) |
| **B. collectionStatus 컬럼** | `collectionStatus(pending/paid/confirmed/failed/refunded)` 신규 컬럼 | online+offline 단일 개념, guard 명확 | migration + backfill + UI/API 영향 | **V2 채택** |
| **C. metadata 기반** | `metadata.collectionStatus` 등 | migration 없이 시작, bridge 주문 즉시 적용 | 쿼리/인덱싱/정합성 약함 | bridge 임시(V1 보조)만 |
| **D. settlementReady/fulfillmentReady flag** | 파생 boolean | guard 단순 | 원인 불명확, payment/refund 와 drift | 비채택(파생값은 계산으로) |
| **E. source별 예외** | event_offer/B2C/B2B 별 readiness | — | **사용자 기준 위반** (source 가 주문 이후 모델을 나눔) | **비채택** |

---

## 11. 권장 readiness 모델

```
[online 결제 주문]
  paymentReady  := checkout_orders.paymentStatus = 'paid'   (== status='paid' && paidAt not null)
                   또는 neture_orders.status = 'paid'(파생)

[offline / operator 확정 주문]  ← V2 도입
  collectionReady := collectionStatus = 'confirmed'  (또는 collectionConfirmedAt not null)

[공통]
  fulfillmentReady := (paymentReady OR collectionReady) AND status NOT IN (cancelled, refunded)
  settlementReady  := delivered AND (paymentReady OR collectionReady)
                      AND status NOT IN (cancelled, refunded) AND NOT already settled
```

**단계 구현:**
- **V1**: checkout_orders online 주문은 `paymentStatus='paid'` 기준. bridge 주문은 readiness 없으면 fulfillment/settlement **제외**. (collection 은 metadata 보조 가능하나 권장 안 함 — readiness 없으면 그냥 제외.)
- **V2**: `collectionStatus` 컬럼 도입 + neture_orders legacy 를 readiness 기준으로 수렴.
- **V3**: settlement inclusion / refund adjustment(정산 후 환불 조정) 모델 정리.

---

## 12. fulfillment guard 기준

**적용 위치 (우선순위):**
1. **bridge 시 checkout_order → fulfillment 진입점** — readiness 없는 주문은 fulfillable 화 금지.
2. `supplier-unified-order.service` checkout_order `canFulfill` — `paymentStatus='paid'` 일 때만 true 후보(bridge 동반).
3. `supplier-order.service.updateOrderStatus`(→preparing) / `createShipment` — readiness 없으면 차단.

**기준:**
```
if NOT fulfillmentReady(order):  # paymentReady/collectionReady 아님 또는 cancelled/refunded
    preparing/shipped/delivered 전이 금지
```

**적용 범위 (단계):**
- **V1 우선**: checkout_order-origin(bridge) 주문 + checkout_orders direct fulfillment 가 생기는 경우.
- **V2 확대**: legacy neture_orders(`created→preparing` 무가드). **V1 즉시 적용 금지 — 기존 B2B 운영 파괴 위험.**

---

## 13. settlement guard 기준

**적용 위치**: `neture-settlement.service.calculateSettlements` 의 WHERE 절, 향후 checkout_order settlement inclusion 쿼리.

**기준:**
```
delivered
AND (paymentReady OR collectionReady)
AND status NOT IN (cancelled, refunded)
AND NOT already settled
```

**bridge 주문 처리 옵션:**
- A. readiness 없으면 정산 제외 (권장 — 안전)
- B. `metadata.source='checkout_order'` 는 readiness 모델 도입 전까지 제외
- C. readiness 모델 도입 후 포함

> 현재 정산은 neture_orders 전용이라 즉시 위험은 낮으나, **bridge 도입 시점에 settlement guard 가 이미 존재해야** 미결제 자동 정산을 막는다.

---

## 14. checkout_order → supplier fulfillment bridge 전제조건

bridge 구현 전 **반드시** 충족:
```
1. bridge 대상은 paymentStatus='paid' (또는 collectionStatus='confirmed') 주문만.
2. pending checkout_order(= 모든 checkout-confirm event_offer 주문 초기 상태)는 bridge 금지.
3. bridge 후 neture_order 가 delivered 되어도 settlement guard 가 readiness 재확인.
4. unified view 에서 미결제 주문이 canFulfill=true 가 되지 않도록 보장.
```

> **이 IR 의 가장 중요한 단일 고정 사실**:
> **event_offer cart-confirm 주문은 아직 `paid` 가 아니다 (`CREATED`+`PENDING`).**
> bridge 를 만들 때 이 pending 주문을 공급자 배송 흐름에 태우면 미결제 배송/정산 사고가 난다.

---

## 15. 단계별 로드맵

| Phase | 산출 | 핵심 |
|------|------|------|
| 1 | **본 IR** | paymentReady/collectionReady/fulfillmentReady/settlementReady 정의 |
| 2 | `WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1` | checkout_order-origin/bridge 주문 우선, pending canFulfill=false 유지 |
| 3 | `WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1` | bridge 주문 자동 정산 방지, readiness 없는 delivered 제외 |
| 4 | `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` | paid/confirmed 주문만 bridge (pending 금지) |
| 5 | `IR/WO-O4O-ORDER-COLLECTION-STATUS-MODEL-V1` | collectionStatus 컬럼 도입, neture_orders legacy 수렴 |
| (병행) | `WO-O4O-KPA-PAID-TRANSITION-SALES-LIMIT-HARDENING-V1` | Glyco recheck 패턴(취소·환불 정책 동반) |

**guard 가 bridge 보다 먼저** (Phase 2·3 → Phase 4).

---

## 16. 다음 구현 WO 제안

1. `WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1` — readiness 없는 주문 배송 시작 불가 (V1: bridge/checkout-origin 한정).
2. `WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1` — delivered + readiness 주문만 정산.
3. `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` — readiness 없는 checkout_order bridge 금지.
4. `IR/WO-O4O-ORDER-COLLECTION-STATUS-MODEL-V1` — offline/operator collection readiness 명시 모델.
5. `WO-O4O-KPA-PAID-TRANSITION-SALES-LIMIT-HARDENING-V1` — payment.completed 직전 sales_limit 재검증.

---

## 17. 이번 IR 에서 수정하지 않은 것

```
코드 / DB schema / migration / API / UI 무변경.
정산 쿼리·fulfillment 전이표 무변경.
legacy neture_orders 무변경(즉시 guard 적용 안 함 — 운영 보호).
KPA B2C 고정 3000 배송비 무변경.
다른 세션 WIP 무접촉.
```

발견된 GAP/RISK(fulfillment·settlement 무가드, checkout-confirm pending)은 본 문서에 기록만 하고, 구현은 §15 로드맵의 별도 WO 로 분리한다.

---

*Date: 2026-06-11 · Status: 완료 (readiness 모델 정의 + fulfillment/settlement guard 기준 확정. 핵심 고정: event_offer cart-confirm 주문은 paid 아님 → bridge 전 guard 필수).*
