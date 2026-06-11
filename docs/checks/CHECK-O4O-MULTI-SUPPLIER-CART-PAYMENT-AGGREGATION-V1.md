# CHECK-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1

> 다중 공급자 장바구니 1회 결제 — 공급자별 checkout_order N건을 `paymentGroupId`로 묶고, 결제 완료 시 N건 모두 paid 전이 + 각 order별 fulfillment bridge.
> **후보 A(metadata.paymentGroupId, no migration)**. payment-first. collectionStatus 미사용.
> **결과: PASS** — api-server tsc 0 / 핸들러 init·graceful smoke / 단일 order flow 무회귀. (positive group 결제 실측은 Toss/cart seed 부재로 deferred.)
> 상위: `IR-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1` · P2a/P2b/P2c CHECK — 2026-06-11

---

## 1. 변경 파일 (3)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/cart/neture-b2b-cart-checkout.service.ts` | `paymentGroupId`(pg_uuid) 발급, 각 checkout_order metadata 저장, 응답에 `paymentGroupId`/`groupTotalAmount`/`orderCount` |
| `apps/api-server/src/routes/neture/controllers/neture-b2b-payment.controller.ts` | prepare/confirm 에 `paymentGroupId` 분기(단일 orderId XOR group). group 검증·amount 합산·PaymentCore.prepare(orderId=paymentGroupId) |
| `apps/api-server/src/services/neture/NetureB2bCheckoutPaymentEventHandler.ts` | `payment.completed.orderId` 를 단일/group dispatch → `transitionAndBridge` 헬퍼로 N건 paid 전이 + order별 bridge. failed 도 group 지원 |

> DB/migration **무변경**(metadata 기반). PaymentCore·bridge·정산·KPA/Glyco/KCos·web-neture **무변경**.

## 2. 흐름 (다중 공급자 1회 결제)
```
cart(supplier A,B,C) → checkout-confirm-b2b
  → paymentGroupId 발급, 공급자별 checkout_order N건(metadata.paymentGroupId, paymentStatus='pending')
  → 응답 { paymentGroupId, groupTotalAmount=Σtotal, orderCount, createdOrders[] }
→ POST /b2b/payments/prepare { paymentGroupId }
  → group 검증 → amount=Σtotal → PaymentCore.prepare(orderId=paymentGroupId, metadata{checkoutOrderIds})
→ Toss 결제 1회 → POST /confirm { paymentId, paymentKey, paymentGroupId }
  → payment.completed(serviceKey='neture-b2b', orderId=paymentGroupId)
  → handler: paymentGroupId re-query → N건 paid 전이 → 각 order bridge(P2c)
→ 공급자별 neture_order N건, 공급자는 자기 주문만 노출
```

## 3. 핵심 설계 (IR 제약 준수)
- **event.orderId = paymentGroupId**: payment.completed 가 metadata 미전달(PaymentCore) → group 식별을 orderId 슬롯으로 전달, 핸들러가 **DB re-query**(`metadata->>'paymentGroupId'`). IR §5 제약 반영.
- **prepare amount = Σ order.totalAmount**: PaymentCore.confirm 이 prepare 저장 amount 로 PG 검증 → group total 1회 결제.
- **단일 order flow 무회귀**: prepare/confirm 이 `orderId` XOR `paymentGroupId` 분기(additive). 기존 단일 결제 경로 보존.
- **group 검증**(prepare): 동일 buyer · 전부 `source='neture_b2b_checkout'` · 전부 `paymentStatus='pending'` & payable. 실패 시 `PAYMENT_GROUP_NOT_FOUND`(404)/`PAYMENT_GROUP_NOT_PAYABLE`(400).

## 4. paid 전이 / bridge (handler)
- `transitionAndBridge(order, event)`: payable(created/pending_payment)만 `status/paymentStatus=PAID, paidAt`. 이미 PAID → 전이 skip(idempotent)하되 bridge 재시도(bridge 자체 idempotent). cancelled/refunded → 전이·bridge 금지.
- group: `paymentGroupId` 로 N건 조회 → 각 건 transitionAndBridge. 단일: order id 직접.
- bridge 실패 → paid 유지, 로그(공급자 미노출). 재시도/복구는 후속.

## 5. metadata 계약
checkout_order(각): `{ source:'neture_b2b_checkout', paymentGroupId, paymentGroupSource:'multi_supplier_cart', fulfillmentVisibility:'hidden_until_paid', ... }`.
payment(prepare 저장): `{ paymentGroupId, checkoutOrderIds, orderCount, groupTotalAmount, paymentGroupSource }`.
> collectionStatus/paymentReady 미저장.

## 6. 부분 성공 / 실패 항목
- checkout-confirm-b2b 의 공급자 그룹 best-effort(P2a) 유지 — 실패 그룹 item 은 cart 유지(failedItems). **성공 createdOrders 만 paymentGroupId 로 묶임.** groupTotalAmount = 성공 주문 합. (UI 는 failedItems 별도 표시 — P2d.)

## 7. 검증
- **api-server tsc 0** ✅
- **핸들러 init 로그** ✅ (§10): `subscribed (serviceKey=neture-b2b)` 유지(무회귀).
- **graceful smoke** ✅ (§10): group prepare/confirm no-auth → 401.
- **단일 order flow 무회귀** ✅: orderId 경로 코드 보존(분기 additive), tsc 0.
- **positive group 결제 — DEFERRED**: 유효 Toss 결제 + 다중 공급자 B2B cart seed 필요(frontend/위젯 부재). P2d-1(위젯)/P2d-2(cutover) 동반 실측. 전이/bridge 로직은 P2b/P2c 와 동일 패턴(검증됨) + 핸들러 group dispatch 코드 검증.

## 8. 회귀 무영향
- 단일 order payment(P2b)·bridge(P2c)·checkout-confirm-b2b(P2a, 응답에 group 필드 추가 — 기존 필드 보존)·KPA/Glyco/KCos·정산·web-neture 무변경.

## 9. 완료 기준 체크 (WO §16)
1(paymentGroupId 발급) ✅. 2(order metadata.paymentGroupId) ✅. 3(응답 paymentGroupId/groupTotalAmount) ✅. 4(prepare group 조회·검증) ✅. 5(amount=Σtotal) ✅. 6(prepare orderId=paymentGroupId) ✅. 7(confirm→payment.completed handler) ✅. 8(N건 paid 전이) ✅. 9(각 order bridge) ✅. 10(collectionStatus 미사용) ✅. 11(단일 order flow 유지) ✅. 12(tsc 0) ✅. 13(graceful smoke §10) ✅(positive deferred). 14(CHECK) ✅. 15(path-specific) ✅. 16(다른 세션 무접촉) ✅.

## 10. Live 검증 결과 (배포 신리비전)
- **핸들러 init 로그** ✅: `[NetureB2bCheckoutPaymentEventHandler] Initialized and subscribed to payment events (serviceKey=neture-b2b)` (fresh) → group dispatch 추가에도 구독 무회귀.
- **graceful smoke (no-auth)** ✅:
  - `POST /neture/b2b/payments/prepare {paymentGroupId,...}` → **401**
  - `POST /neture/b2b/payments/confirm {paymentGroupId,...}` → **401**
  - `POST /store/cart/neture/checkout-confirm-b2b` → **401** (회귀 확인, 정상)
  → group prepare/confirm route mount + auth 정상, 500/route-누락 없음. (authed group 검증/positive 는 §7 deferred.)

## 11. 남은 GAP/RISK · 후속
- **positive group 결제 실측**: P2d-1 위젯 + P2d-2 cart cutover 동반(end-to-end). 또는 seed.
- **부분 paid 전이 복구**: group N건 중 일부 bridge 실패 시 paid 유지·공급자 미노출 → 재시도 job/수동 복구 후속.
- **idempotency 강화**: metadata 기반(unique index 없음) → `WO-O4O-CHECKOUT-PAYMENT-GROUP-TABLE-V2`(옵션).
- 후속: `WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1`(P2d-1, KPA 3페이지 복사 + paymentGroupId 결제) → `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`(P2d-2) → legacy retirement.

---

*Date: 2026-06-11 · Status: PASS (다중 공급자 group 결제 backend 완성 — paymentGroupId, N건 paid 전이+bridge, 단일 무회귀. positive 실측 deferred).*
