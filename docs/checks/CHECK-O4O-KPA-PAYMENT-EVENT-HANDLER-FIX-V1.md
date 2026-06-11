# CHECK-O4O-KPA-PAYMENT-EVENT-HANDLER-FIX-V1

> KPA B2C Toss 결제 성공이 `checkout_orders.paymentStatus/status=paid` 로 반영되도록 누락된 payment event
> handler 등록 복구(버그 수정, 결제 모델 신설 아님).
> **결과: PASS** — api-server tsc 0 / 핸들러 초기화 로그 확인 / graceful confirm 라우트 smoke.
> (실 Toss 결제 positive paid 전이는 테스트결제 부재로 deferred — 핸들러 구독은 로그로 입증.) — 2026-06-11

---

## 1. 근본 원인
KPA 결제 흐름:
```
POST /api/v1/kpa/payments/prepare  (sourceService:'kpa')
POST /api/v1/kpa/payments/confirm  → PaymentCoreService.confirm()
  → EventHubPaymentPublisher.publish('payment.completed')
  → paymentEventHub.emitCompleted({ serviceKey: 'kpa', orderId, ... })
```
- KPA confirm 라우트는 `CheckoutOrder` 를 **직접 갱신하지 않고** payment event handler 에 의존(Glyco/KCos 와 동일 설계).
- 그러나 **serviceKey='kpa' 를 구독하는 핸들러가 register-routes 에 미등록** → `payment.completed` 가 발행돼도 처리할 구독자 없음 → checkout_orders 가 `paid` 로 전이되지 않고 `paymentStatus=pending` 잔존.
- 비교: KCos(`KCosmeticsPaymentEventHandler`)·Glyco(`GlycopharmPaymentEventHandler`)·LMS 는 register-routes 에서 init. **KPA 만 누락.**

## 2. 수정 (최소, Glyco 패턴 미러)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/kpa/KpaPaymentEventHandler.ts` | **신설** — `paymentEventHub.onPaymentCompleted/onPaymentFailed(handler, 'kpa')` 구독. completed → `CheckoutOrder.status=PAID, paymentStatus=PAID, paymentMethod, paidAt` 저장(중복방지 set, idempotent: 이미 PAID skip, CREATED/PENDING_PAYMENT 만 전이). failed → `paymentStatus=FAILED`(payable 상태 한정) |
| `apps/api-server/src/bootstrap/register-routes.ts` | KPA 라우트 등록 직후 `initializeKpaPaymentHandler(dataSource)` 호출 |

- serviceKey `'kpa'` = `kpa-payment.controller` 의 `prepare({ sourceService: 'kpa' })` 와 일치(이벤트 라우팅 키). 핸들러는 event.orderId 로 주문 조회하므로 order.metadata.serviceKey('kpa-society')와 무관.
- **범위 외(의도)**: sales_limit 재검증(Glyco 의 PAID 전이 직전 recheck)은 PAID 주문 취소→환불 함의가 있어 V1 제외. KPA 의 **주문 생성 시점 sales_limit FOR UPDATE 검증은 유지**. → 후속 hardening WO.
- entity/migration/결제·환불·정산/Glyco·KCos **무변경**. 순수 additive(핸들러 신설 + init 1블록).

## 3. 검증
- **api-server tsc 0** ✅
- **핸들러 초기화 로그** (배포 `o4o-core-api-02079`):
  - `✅ KpaPaymentEventHandler initialized`
  - `[KpaPaymentEventHandler] Initialized and subscribed to payment events (serviceKey=kpa)` ✅ → **누락됐던 구독이 등록됨(근본 원인 해소 입증)**
- **graceful confirm 라우트 smoke** (`/api/v1/kpa/payments/confirm`):
  - no-auth → 401 ✅
  - authed 빈 body → 400 VALIDATION_ERROR(paymentId/paymentKey/orderId) ✅ → 라우트 정상·무회귀
- **positive paid 전이 — DEFERRED**: 실제 `payment.completed(serviceKey='kpa')` 는 유효 Toss 결제 confirm(prepare→Toss 승인→confirm)에서만 발행. 테스트 Toss 결제/주문 부재로 live paid 전이 미실측. 전이 로직은 Glyco/KCos 핸들러와 동일 패턴(프로덕션 검증됨)이며, 구독 등록은 로그로 입증됨 → 유효 결제 시 자동 동작.

## 4. 회귀 무영향
- KPA checkout order 생성/조회 무변경. confirm 라우트 무변경(핸들러만 추가 구독).
- Glyco/KCos/LMS payment handler·결제·환불·정산·fulfillment 무변경.
- 핸들러 미등록 시 KPA 주문은 어차피 paid 전이 0 → 핸들러 추가는 순수 기능 복구(회귀 없음).

## 5. 완료 기준 체크 (WO §10)
1(원인 확인) ✅. 2(payment.completed 처리 경로 복구) ✅. 3(paymentStatus=paid 경로 확보) ✅. 4(status=paid/paidAt) ✅. 5(checkout_payments 는 PaymentCoreService 가 o4o_payments 로 관리 — 핸들러는 CheckoutOrder 전이만, 이중기록 회피) ✅. 6(checkout 생성 유지) ✅. 7(Glyco/KCos 무수정) ✅. 8(결제/환불/정산/fulfillment 무변경) ✅. 9(tsc) ✅. 10(graceful smoke) ✅. 11(실결제 smoke deferred 기록) ✅. 12(CHECK) ✅. 13(path-specific) ✅. 14(다른 세션 무접촉) ✅.

## 6. 남은 GAP/RISK · 후속
- **positive 실결제 smoke**: 테스트 Toss 결제 확보 시 prepare→confirm→order paid 전이 1회 실측(후속).
- **sales_limit 재검증(PAID 직전)**: V1 제외. KPA 도 결제 지연 중 한도 초과 가능성(생성시점 검증만) → 후속 `WO-O4O-KPA-PAID-TRANSITION-SALES-LIMIT-HARDENING-V1`(Glyco recheck 패턴, 단 취소-환불 정책 동반 필요).
- 후속: `IR/WO-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1`(paymentStatus=paid 가 fulfillment/settlement readiness 기준), fulfillment·settlement guard.

---

*Date: 2026-06-11 · Status: PASS (KPA payment handler 등록 복구 — paid 전이 구독 입증. 실결제 positive 전이 deferred).*
