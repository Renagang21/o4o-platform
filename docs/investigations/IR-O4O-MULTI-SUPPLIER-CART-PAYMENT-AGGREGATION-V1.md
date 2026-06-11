# IR-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1

> **유형**: Investigation (IR) — **구현 FEASIBLE 판정 + turnkey 설계**(구현은 후속 WO)
> **목적**: 다중 공급자 장바구니를 **1회 결제**하고 결제 성공 후 공급자별 checkout_order N개를 모두 paid 전이·fulfillment bridge 하는 모델을 확정한다.
> **성격**: 코드/DB/API/UI **무변경**. 조사·설계 문서만.
> **핵심 질문(사용자)**: "paymentGroupId(metadata)로 충분한가, payment group **table** 이 필요한가?" → **metadata 로 충분(V1). table 불필요.**
> **상위 기준**: P2a/P2b/P2c CHECK · `CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1`
> **작성일**: 2026-06-11

---

## 1. 요약 판정 — **FEASIBLE (후보 A, metadata.paymentGroupId, no migration)**

| 조사 질문 | 답 |
|------|-----|
| PaymentCore.prepare 가 metadata/amount 보존? | **예** — `prepare` 가 `request.metadata` 를 payment.metadata 로 저장(`PaymentCoreService.ts:69-70`), amount 도 서버 저장. confirm 은 **저장 amount 로 검증**(프론트 금액 미사용, L118). → group total 을 prepare amount 로 주면 1회 결제 검증 OK |
| payment.completed event 가 group 정보(metadata/orderIds)를 실어 전달? | **아니오 (KEY)** — confirm 의 발행 payload(L157-170)에 **metadata 없음**(paymentId/orderId/sourceService/paidAmount/...만). → 핸들러는 event.metadata 로 group 못 받음 |
| 그래도 N개 order 전이 가능? | **예** — 핸들러가 **event.orderId 를 paymentGroupId 로 받아 checkout_orders 를 metadata.paymentGroupId 로 re-query** → N개 전이. event metadata 불요 |
| payment group 저장 위치 | **checkout_orders.metadata.paymentGroupId** (V1). 별도 table/migration **불필요**(V2 hardening 옵션) |
| 다중 공급자 결제 합산 IR(별도) 필요? | **불요** — 본 모델로 1회 결제 닫힘 |

→ **결론**: 후보 A(metadata.paymentGroupId) 로 **DB migration 없이** 구현 가능. 단 **payment.completed event 에 metadata 가 없으므로**, group 식별은 **event.orderId = paymentGroupId 로 두고 핸들러가 DB re-query** 하는 설계가 강제된다. 이 한 가지 제약이 설계의 핵심.

## 2. §13 중단조건 점검 (모두 미적중)
```
PaymentCore가 group metadata 보존 못함        → 아님(prepare 가 metadata 저장)
payment.completed 에서 group 정보 못 받음      → event metadata 는 없으나, event.orderId=paymentGroupId + DB re-query 로 해소
metadata 로 paymentGroupId 조회 불안정          → checkout_orders.metadata->>'paymentGroupId' 인덱스/조회 가능, V1 충분
N개 order paid 전이 안전 처리 어려움            → 주문별 idempotent 전이(loop) 로 처리
payment group DB table 반드시 필요             → 아님(V1 metadata, V2 옵션)
기존 단일 order payment flow 충돌               → prepare 가 orderId XOR paymentGroupId 분기(additive) 로 회피
Toss amount 가 단일 order 에 강결합              → 아님(prepare 저장 amount 검증 — group total 주입 가능)
```
→ **구현 보류 사유 없음.** 단 본 IR 에서 설계만 고정하고, 구현은 P2d-1(결제위젯)·P2d-2(cart cutover)와 함께 positive 검증 가능한 시점에 후속 WO 로 수행 권장(현재 frontend/위젯 부재 — 단독 구현 시 positive 무검증).

## 3. 확정 설계 (후보 A — turnkey)

### 3.1 group id 발급 — checkout-confirm-b2b
`NetureB2BCartCheckoutService.confirm()` 보정:
- 호출 시작 시 `paymentGroupId` 1개 발급(예: `pg_{uuid}`; Date/random 은 service 코드라 사용 가능).
- 생성되는 **각 checkout_order metadata 에 `paymentGroupId` + `paymentGroupSource:'multi_supplier_cart'` 저장**.
- 응답에 `paymentGroupId` + `groupTotalAmount(=Σ createdOrders.totalAmount)` 추가.
- (단일 공급자면 createdOrders 1개·동일 group — 일관 처리.)

### 3.2 prepare — neture-b2b payment controller (group 분기 additive)
```
POST /api/v1/neture/b2b/payments/prepare
  body: { paymentGroupId, successUrl, failUrl }   // 기존 { orderId } 와 XOR
서버 검증:
  - paymentGroupId 로 checkout_orders 조회(metadata.paymentGroupId, buyerId 일치)
  - 모두 paymentStatus='pending' & status∈{created,pending_payment} & source='neture_b2b_checkout'
  - amount = Σ totalAmount
  - PaymentCore.prepare({ orderId: paymentGroupId, internalOrderId: paymentGroupId,
                          amount, sourceService:'neture-b2b',
                          metadata:{ checkoutOrderIds:[...], paymentGroupId } })
```
- PG orderId = paymentGroupId(고유). 기존 단일 order prepare(orderId)는 그대로 유지.

### 3.3 confirm — 동일 컨트롤러
```
POST /confirm body: { paymentId, paymentKey, paymentGroupId }
  → PaymentCore.confirm(paymentId, paymentKey, paymentGroupId /*PG orderId*/, paymentGroupId /*internalOrderId*/)
  → payment.completed(serviceKey='neture-b2b', orderId=paymentGroupId)
```

### 3.4 paid 전이 — NetureB2bCheckoutPaymentEventHandler (group 지원)
```
handlePaymentCompleted(event):
  // 1) 단일 order 경로(기존): findOne({id: event.orderId}) → 있으면 그 order 전이 (backward compat)
  // 2) group 경로(신규): 없으면 checkout_orders WHERE metadata->>'paymentGroupId' = event.orderId
  //    → 각 order paid 전이(payable 한정·idempotent) → 각 order bridge 호출(best-effort)
```
- 부분 실패: 이미 paid 는 skip, 실패 order 만 재처리 대상 로그(CRITICAL). PG 결제는 성공했으므로 전이는 idempotent 하게 완료 지향.

### 3.5 bridge
- 기존 `CheckoutFulfillmentBridgeService.bridgeCheckoutOrderToNetureFulfillment({checkoutOrderId})` 를 **order 별로 N회** 호출. 이미 order 별 idempotent(metadata.checkoutOrderId) → group 에도 안전.

## 4. metadata 계약 (V1)
checkout_order(각):
```
metadata: { source:'neture_b2b_checkout', paymentGroupId, paymentGroupSource:'multi_supplier_cart',
            fulfillmentVisibility:'hidden_until_paid', ... (기존 P2a 필드) }
```
payment(prepare 저장, event 미전달이나 감사/재시도용):
```
metadata: { paymentGroupId, checkoutOrderIds:[...], paymentGroupSource:'multi_supplier_cart' }
```
> collectionStatus 미사용.

## 5. 핵심 제약 (구현 WO 가 반드시 지킬 것)
1. **event.orderId = paymentGroupId** — payment.completed 에 metadata 가 없으므로 group 식별은 orderId 슬롯으로만 전달된다. 핸들러는 event.orderId 를 (a) checkout_order id 로 먼저 시도, (b) 실패 시 paymentGroupId 로 re-query.
2. **prepare amount = Σ order.totalAmount** — confirm 이 이 저장 amount 로 PG 검증. 그룹 합과 PG 승인액 일치 필수.
3. **단일 order flow 무회귀** — prepare/confirm 은 orderId XOR paymentGroupId 분기(additive). 기존 단일 결제 경로 보존.
4. **buyer 일치·pending 한정** 검증 — 타 buyer/이미 paid order 가 group 에 섞이지 않도록 prepare 에서 차단.

## 6. V2 hardening (옵션 — 본 IR 범위 밖)
- `checkout_payment_groups` table(id/buyerId/serviceKey/status/totalAmount/orderIds/paymentId/paidAt) → 재시도/조회/감사·동시성 robust. metadata 기반 V1 의 race(낮음) 보완.
- `WO-O4O-CHECKOUT-PAYMENT-GROUP-MODEL-V1` 로 분리.

## 7. 이번 IR 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경.
PaymentCore·checkout-confirm-b2b·payment controller·handler·bridge 무변경.
다른 세션 WIP 무접촉.
```

## 8. 후속 WO
1. `WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1`(구현) — §3 설계대로 group prepare/confirm + group paid 전이 + order별 bridge. **P2d-1(결제위젯)/P2d-2(cart cutover) 와 함께(positive 검증 가능 시점)** 권장.
2. (옵션) `WO-O4O-CHECKOUT-PAYMENT-GROUP-MODEL-V1`(V2 table).
3. P2d 라인: `WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1`(P2d-1) → `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`(P2d-2).

## 9. 최종 기준 문장
다중 공급자 장바구니의 1회 결제는 **checkout_orders.metadata.paymentGroupId(별도 table 불필요)** 로 충분히 구현 가능하다. 단 `payment.completed` event 가 metadata 를 싣지 않으므로, **group 식별은 event.orderId 를 paymentGroupId 로 두고 핸들러가 DB re-query** 하는 설계가 강제된다. 사용자는 group total 1회 결제, 내부적으로 N개 checkout_order 가 모두 paid 전이·공급자별 bridge 된다. V1 은 metadata, V2 는 table hardening(옵션).

---

*Date: 2026-06-11 · Status: IR 완료 (FEASIBLE, 후보 A metadata.paymentGroupId, table 불필요. event metadata 미전달 → handler DB re-query 설계 고정. 구현은 P2d 라인과 함께 후속).*
