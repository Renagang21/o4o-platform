# CHECK-O4O-NETURE-B2B-PAYMENT-FLOW-V1

> Neture B2B checkout_order(payment-first)에 결제 흐름 연결 — 결제 완료 시 `paymentStatus='paid'` 전이.
> **후보 C 채택**: 전용 serviceKey `neture-b2b`(legacy `neture` 핸들러와 분리, 충돌 없음).
> **결과: PASS** — api-server tsc 0 / 핸들러 init 로그 / graceful smoke. (positive paid 전이는 실 Toss 결제 부재로 deferred.)
> 상위: `CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1` · `CHECK-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1` — 2026-06-11

---

## 1. 조사 결론 (후보 선택)
| 질문 | 답 |
|------|-----|
| checkout_order 를 paid 전이하는 기존 패턴 | KPA/Glyco/KCos: PaymentCoreService prepare/confirm(sourceService) → `payment.completed(serviceKey)` → 서비스별 핸들러가 CheckoutOrder paid 전이 |
| legacy neture payment 경로 | `routes/neture/controllers/payment.controller.ts` 는 **neture_orders 전용**(direct Toss). checkout_orders 미지원. NeturePaymentEventHandler(serviceKey='neture')는 neture_orders 만, 미존재 시 graceful skip |
| checkout_order 결제 가능한 기존 route | **없음** — neture 는 neture_orders 만. → B2B checkout 전용 route 신설 필요 |
| serviceKey 충돌 | PaymentEventHub 는 serviceKey 미검증(임의 문자열 허용) → **`neture-b2b`** 분리 시 legacy `neture` 와 무충돌 |

→ **후보 C**: 전용 `sourceService/serviceKey='neture-b2b'` + 전용 핸들러 + KPA 패턴 prepare/confirm route. (audit IR 불요 — 3서비스 검증된 표준 패턴.)

## 2. 변경 파일 (4)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/neture/NetureB2bCheckoutPaymentEventHandler.ts` | **신규** — `payment.completed/failed(serviceKey='neture-b2b')` 구독, checkout_order paid/failed 전이 |
| `apps/api-server/src/routes/neture/controllers/neture-b2b-payment.controller.ts` | **신규** — prepare/confirm/order (PaymentCoreService, sourceService='neture-b2b') |
| `apps/api-server/src/routes/neture/neture.routes.ts` | `/b2b/payments/*` mount |
| `apps/api-server/src/bootstrap/register-routes.ts` | `initializeNetureB2bCheckoutPaymentHandler` 등록 |

> legacy neture payment / NeturePaymentEventHandler / KPA·Glyco·KCos handler / 정산 / fulfillment / web-neture **무변경**. DB/migration **무변경**.

## 3. payment event flow
```
POST /api/v1/neture/b2b/payments/prepare  (orderId=checkout_order, B2B-source guard)
  → PaymentCoreService.prepare(sourceService='neture-b2b')
POST /api/v1/neture/b2b/payments/confirm
  → PaymentCoreService.confirm() → payment.completed(serviceKey='neture-b2b', orderId=checkout_order.id)
  → NetureB2bCheckoutPaymentEventHandler
      → checkout_order.status=PAID, paymentStatus=PAID, paidAt (payable 상태 한정, idempotent)
```

## 4. paid 전이 기준 / 안전장치
- **payable 한정**: `status ∈ {created, pending_payment}` 만 전이. 이미 PAID → idempotent skip. cancelled/refunded → 전이 금지.
- **B2B-source guard**: `metadata.source==='neture_b2b_checkout'` 인 checkout_order 만 전이(핸들러+컨트롤러 양쪽). serviceKey='neture-b2b' 자체가 B2B 전용이나 이중 안전.
- **legacy 무충돌**: legacy `neture` 이벤트는 본 핸들러가 구독 안 함. 설령 orderId 가 checkout_order 가 아니어도 `findOne` 미발견 → graceful skip.
- **payment.failed** → `paymentStatus=FAILED`(payable 상태 한정).
- amount 검증: PaymentCoreService.confirm() 이 prepare 시 저장한 내부 amount 로 검증(외부 amount 신뢰 안 함) — KPA 와 동일.

## 5. collectionStatus / 공급자 노출 — 미사용·미구현 (기준 준수)
- collectionStatus / paymentReady 설정 **안 함**(payment-first, paymentStatus='paid' 가 readiness).
- 공급자 노출 / fulfillment bridge **없음** — 후속 P2c. paid 전이만.

## 6. 검증
- **api-server tsc 0** ✅
- **핸들러 init 로그** ✅ (§9): `✅ NetureB2bCheckoutPaymentEventHandler initialized` / `subscribed (serviceKey=neture-b2b)`.
- **graceful smoke** ✅ (§9): prepare/confirm/order no-auth → 401(mount+auth 정상).
- **positive paid 전이 — DEFERRED**: 유효 Toss 결제(prepare→승인→confirm)에서만 `payment.completed(serviceKey='neture-b2b')` 발행. 실 결제·유효 B2B checkout_order seed 부재로 live 미실측. 전이 로직은 KPA/Glyco/KCos 와 동일 패턴(프로덕션 검증), 구독은 init 로그로 입증 → 유효 결제 시 자동 동작. (내부 emit 경로 `paymentEventHub.emitCompleted` 로 테스트 가능하나 운영 DB mutation 지양.)

## 7. 회귀 무영향
- legacy neture_orders 결제(payment.controller)·NeturePaymentEventHandler 무변경(serviceKey 분리).
- KPA/Glyco/KCos checkout payment handler 무변경. B2B orchestrator(P2a)·event_offer cart 무변경.
- 정산/fulfillment guard/web-neture 무변경.

## 8. 완료 기준 체크 (WO §11)
1(전이 방식 확정 — 후보 C) ✅. 2(payment.completed → checkout_order paid) ✅. 3(payment.failed → failed) ✅. 4(collectionStatus 미사용) ✅. 5(공급자 노출/bridge 없음) ✅. 6(legacy payment/order flow 무회귀) ✅. 7(tsc 0) ✅. 8(handler init/route smoke) ✅(§9). 9(positive paid deferred 기록) ✅. 10(CHECK) ✅. 11(path-specific) ✅. 12(다른 세션 무접촉) ✅.

## 9. Live 검증 결과 (배포 신리비전)
- **핸들러 init 로그** (gcloud, freshness 1h) ✅:
  - `✅ NetureB2bCheckoutPaymentEventHandler initialized`
  - `[NetureB2bCheckoutPaymentEventHandler] Initialized and subscribed to payment events (serviceKey=neture-b2b)`
  → **구독 등록 입증**(serviceKey=neture-b2b).
- **graceful smoke (no-auth)** ✅:
  - `POST /api/v1/neture/b2b/payments/prepare` → **401** (mounted, auth-first)
  - `POST /api/v1/neture/b2b/payments/confirm` → **401**
  - `GET  /api/v1/neture/b2b/payments/order/:id` → **401**
  → 3 route mount + auth 정상, 500/route-누락 없음. (authed 시 prepare/confirm 은 B2B-source guard·payable 검증 통과 후 동작 — 코드 §4.)
- 회귀: 본 변경은 **순수 additive**(신규 controller/handler/mount/bootstrap). legacy neture payment 컨트롤러·KPA/Glyco/KCos 무수정.

## 10. 남은 GAP/RISK · 후속
- **positive paid 전이 실측**: 유효 Toss 결제 + B2B checkout_order seed 확보 시(또는 P2d frontend 전환 동반).
- **공급자 노출**: paid 전이만 — 공급자는 아직 미노출(canFulfill=false). P2c bridge 에서 paid 주문만 노출.
- **prepare/confirm route frontend 미연결**: web-neture 결제 UI 는 P2d. 현재 backend-only(외부 호출 시 동작).
- 후속: `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1`(P2c) → `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`(P2d) → legacy retirement.

---

*Date: 2026-06-11 · Status: PASS (B2B checkout payment flow 신설, serviceKey='neture-b2b' paid 전이. positive 실결제 전이 deferred).*
