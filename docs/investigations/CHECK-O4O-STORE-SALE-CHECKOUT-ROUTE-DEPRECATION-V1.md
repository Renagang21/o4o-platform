# CHECK — 매장 소비자 checkout 결제 API deprecation V1

**WO:** `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1`
**일자:** 2026-06-21
**성격:** backend — KPA/GlycoPharm/K-Cosmetics 소비자 결제 `prepare`/`confirm` 신규 생성 차단(410). 데이터/조회/PaymentCore/Neture B2B/구독 축 무변경.
**상위:** `IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1` · `CHECK-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-AUDIT-V1` · `CHECK-O4O-STORE-SALE-CHECKOUT-UI-ENTRY-REMOVAL-V1`(선행 frontend)
**검증:** api-server `tsc --noEmit` — 본 변경 신규 에러 0 (전체 1건은 무관 pre-existing marketTrial)

---

## 1. git 상태 / 다른 세션 WIP

- `git status --short`: `services/web-kpa-society/src/api/multilingual*` + `.../pages/operator/multilingual-product-content/`(untracked, 다른 세션 WIP — multilingual, 결제 무관). **미접촉.**
- 본 WO 변경 = backend 3파일 + 본 CHECK. DB/migration 0.

## 2. 변경 파일 (3 controllers, +54/−0)

| 파일 | 변경 |
|---|---|
| `routes/kpa/controllers/kpa-payment.controller.ts` | `POST /prepare` + `POST /confirm` 진입부에 **410 조기 return** 삽입 |
| `routes/glycopharm/controllers/glycopharm-payment.controller.ts` | 동일 |
| `routes/cosmetics/controllers/cosmetics-payment.controller.ts` | 동일 |

- 삽입 위치: `async (req,res) => {` 직후, `try`/`handleValidationErrors`/`PaymentCoreService.prepare|confirm` **이전**. → PaymentCore/Toss/DB 도달 전 차단.
- 기존 결제 생성 로직은 **삭제하지 않고 보존**(미도달 dead code, `// eslint-disable-next-line no-unreachable`). `allowUnreachableCode` 미설정 → tsc 무에러.

## 3. 차단 응답 (3서비스 일관, 6 endpoint)

```json
HTTP 410 Gone
{
  "success": false,
  "code": "STORE_SALE_PAYMENT_DEPRECATED",
  "message": "매장 소비자 결제는 O4O에서 제공하지 않습니다. 상품 결제는 해당 매장의 POS 또는 현장 결제를 이용해 주세요."
}
```

| 차단 endpoint | 서비스 |
|---|---|
| `POST /api/v1/kpa/payments/prepare` · `/confirm` | KPA |
| `POST /api/v1/glycopharm/payments/prepare` · `/confirm` | GlycoPharm |
| `POST /api/v1/cosmetics/payments/prepare` · `/confirm` | K-Cosmetics |

## 4. 보존 (미차단·미변경)

| 항목 | 상태 |
|---|---|
| `GET /payments/order/:orderId` (3서비스, 조회성) | **보존**(미차단) — `orderRepository` 조회만, PaymentCore 미사용 |
| `checkout_orders` / `o4o_payments` / PaymentEventLog | **무변경**(데이터 삭제 0) |
| `PaymentCoreService` / `TossPaymentProviderAdapter` / `PlatformPayment` / o4o_payments schema | **무변경** |
| `neture-b2b-payment.controller.ts` (B2B_ORDER) | **미접촉**(git diff 0) |
| `store_paid_feature_entitlements` / `FOREIGN_VISITOR_SALES_SUPPORT` (STORE_SERVICE_SUBSCRIPTION) | **미접촉** |

## 5. 정적 검증 (§10.1)

- `STORE_SALE_PAYMENT_DEPRECATED` 삽입 = **6건**(3 files × prepare/confirm).
- 410 return 이 `paymentService.prepare()`/`confirm()` **호출보다 앞**에 위치(소스 순서 확인) → 소비자 결제 route 에서 PaymentCore 미호출.
- `neture-b2b-payment.controller.ts` `git diff` = **0**.
- `PaymentCoreService`/Toss adapter/o4o_payments/migration **변경 0**.

## 6. 타입 검증 (§10.2)

- `apps/api-server` `npx tsc --noEmit` → **본 변경 신규 에러 0**.
- 전체 에러 1건 = `controllers/market-trial/marketTrialController.ts(105,9)` (`productId` not in `CreateTrialDto`) — **무관·pre-existing**(직전 WO 에서 git stash baseline 비교로 확인됨). 본 WO 변경과 분리.

## 7. API smoke (배포 후 권장 — §10.3)

배포 후 read-only 확인 권장(실제 결제 생성 금지):
```text
POST /api/v1/{kpa|glycopharm|cosmetics}/payments/prepare  → 410 STORE_SALE_PAYMENT_DEPRECATED
POST /api/v1/{kpa|glycopharm|cosmetics}/payments/confirm  → 410 STORE_SALE_PAYMENT_DEPRECATED
GET  /api/v1/{...}/payments/order/:orderId                → 보존(미차단)
Neture B2B payment route                                  → 변경 없음
```
- requireAuth 가 먼저 적용되므로 미인증 호출은 401(차단 로직 도달 전). 인증된 호출은 validation 이전에 410. **실제 Toss/paymentKey confirm 시도 금지.**

## 8. 완료 기준 대비 (§13)

| 기준 | 결과 |
|---|---|
| KPA/Glyco/KCos prepare·confirm 신규 생성 차단 | ✅ (410, 6 endpoint) |
| 차단 응답 일관(410) | ✅ STORE_SALE_PAYMENT_DEPRECATED |
| PaymentCore.prepare/confirm 미호출 | ✅ (410 이 앞단) |
| 조회성 route·데이터 보존 | ✅ (GET /order 미차단, 테이블 무변경) |
| checkout_orders/o4o_payments/schema 무변경 | ✅ |
| Neture B2B 무변경 | ✅ (diff 0) |
| STORE_SERVICE_SUBSCRIPTION 무변경 | ✅ |
| CHECK 작성 | ✅ |

## 9. 무변경 확인

- DB/migration/PaymentCore/Toss adapter/o4o_payments/entity **무변경**. 데이터 삭제·상태변경·환불 **없음**.
- 변경 = backend 3 controller(+54/−0, 기존 로직 보존) + 본 CHECK. 다른 세션 WIP 미접촉.

## 10. 후속 WO

```text
1. WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1  ← 매장 경영자 FOREIGN_VISITOR_SALES_SUPPORT 구독 결제 + entitlement ACTIVE
2. WO-O4O-STORE-SALE-CHECKOUT-DEAD-PAGE-CLEANUP-V1    ← PaymentSuccess/Fail 등 dead route/page 정리(선택)
3. WO-O4O-B2B-ORDER-PURPOSE-V1
```

> 배포: 선행 frontend(`STORE-SALE-CHECKOUT-UI-ENTRY-REMOVAL`, web-kpa-society) + 본 backend(api-server) 묶음 배포 권장.

---

*Date: 2026-06-21 · CHECK · backend 3 controller prepare/confirm 410 차단(STORE_SALE_PAYMENT_DEPRECATED) · PaymentCore/Toss/DB 도달 전 · GET /order·데이터·PaymentCore·neture-b2b·구독 축 무변경 · 기존 로직 보존(unreachable) · api-server tsc 신규 에러 0(marketTrial 무관 baseline 제외).*
