# CHECKOUT-STABLE-DECLARATION-V2 — B2B Checkout · PaymentCore Stable 범위

> **상태**: ACTIVE · **작성일**: 2026-10-06 · `WO-O4O-CANONICAL-INDEX-S9-POLICY-DECISION-ALIGNMENT-V1`
> **대체**: [`CHECKOUT-STABLE-DECLARATION-V1`](CHECKOUT-STABLE-DECLARATION-V1.md)(2026-02-24, SUPERSEDED · 본문 보존)
> **상위 정본**: [`O4O-STORE-COMMERCE-BOUNDARY-V1`](O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)

---

## 1. 왜 V2 인가

V1 은 `channel_type='B2C'` 매장 storefront 의 소비자 checkout → 결제 closed loop 을 Stable 로 선언했다. 이 축은 현재 사업 경계에 없다:

- 소비자 결제 경로는 모두 `410 STORE_SALE_PAYMENT_DEPRECATED`(`/kpa/payments/*`)이고, 소비자 주문 생성은 `410 STORE_CONSUMER_ORDER_RETIRED` 다. `/cosmetics/payments/*` 는 `/api/v1/cosmetics/*` 전체와 함께 삭제됐다(2026-10-07 정정 — K-Cosmetics 퇴역 1차-B `WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1`).
- 플랫폼 직접 판매 계약은 NONE 이다(COMMERCE-BOUNDARY, 2026-08-25 확정).

그래서 V2 는 **현재 살아 있는 B2B checkout 과 PaymentCore 공통 계약만** Stable 로 둔다. 이것은 현행 정책을 기록한 것이지 영구 계약이 아니다 — 사업 모델 변경은 COMMERCE-BOUNDARY §15 절차를 따른다.

## 2. Stable 범위 — WO 없이 바꾸지 않는다

### 2-1. B2B checkout 계약

- **주문 생성은 `checkoutService.createOrder()` 단일 지점**(`apps/api-server/src/services/checkout.service.ts`). 독립 `*_orders` · `*_payments` 테이블을 만들지 않는다(`scripts/check-forbidden-tables.mjs`).
- 현행 내부 주문 경로 = 공급자 → 매장 B2B 5축 — event-offer · **승인축 B2B**(KPA Society · K-Cosmetics 승인 상품 — K-Cosmetics 는 퇴역 결정 · 운영 runtime 제거로 **live 축이 아니다**(결제 경로 없음 · 공통 cart 경로는 `k-cosmetics` 를 410 `SERVICE_RETIRED` 로 닫음). 남은 `k-cosmetics` B2B 범위는 퇴역 잔여로 [K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1](../architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md) 가 다룬다(2026-10-07 정정), `/store/cart/:serviceKey/checkout-confirm-b2b` → `StoreB2BCartCheckoutService`, order source `store_b2b_cart`) · Neture B2B · PharmacyHub · **Neture 약국 매장**(B2B 계약 Axis D, `/neture/pharmacy/cart/checkout` → `PharmacyCartService`, `service_key='neture-pharmacy'` · order source `neture_pharmacy_cart`) — 모두 `store_cart_items` → `checkoutService.createOrder()` → `checkout_orders`. 주문 축의 세부 계약은 [B2B 계약](O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) 이 정본이다.
- **payment-first**: UNPAID 주문은 공급자 fulfillment · 배송 · 정산 대상이 아니다. `checkout_order` 의 paid 전이는 결제 완료 처리로만 일어난다(route 가 직접 조작하지 않는다) — PaymentCore 경로는 결제 완료 이벤트(§2-3), Neture 약국 매장은 아래 테스트 결제 confirm 트랜잭션 안에서다.
- 결제 진입은 B2B 전용 namespace 에만 둔다 — `/neture/b2b/payments/*` · `/kpa/b2b/payments/*`(`b2b-payment-controller.factory.ts`) · PharmacyHub `/store-owner/payments/*` · Neture 약국 매장 `/neture/pharmacy/payments/{prepare,confirm}`. 각 진입은 허용 `metadata.serviceKey` · order source 집합으로 서비스 경계를 지킨다. (2026-10-07 정정) `/cosmetics/b2b/payments/*` 는 K-Cosmetics 퇴역 1차-B 로 삭제됐다(`store-b2b-payment-first-canonicalization.spec.ts` 부재 단언).
- **Neture 약국 매장 결제는 PG 독립 테스트 결제다**(`PharmacyPaymentService`, [DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §8-3). PG 와 PaymentCore `confirm()` · 이벤트를 거치지 않고, 결제 묶음 advisory lock · `FOR UPDATE` 아래에서 서버 합산 금액을 재검증한 뒤 `o4o_payments`(`paymentMethod='TEST'`)와 `checkout_orders` 를 직접 paid 로 전이한다. `NETURE_PHARMACY_PAYMENT_MODE=live` 는 `503 PAYMENT_PROVIDER_NOT_SELECTED`, production 미설정은 `503 PAYMENT_NOT_CONFIGURED` 다. 실 PG 연결 방식은 이 문서가 정하지 않는다 — DESIGN 문서 범위다. 아래 §2-2 PaymentCore 규칙은 PaymentCore 를 거치는 경로에 적용된다.

### 2-2. PaymentCore (`packages/payment-core`)

| 규칙 | 위치 |
|---|---|
| **서버 기준 금액 검증** — `confirm()` 은 `prepare()` 때 서버가 정한 `payment.amount` 로만 PG 승인한다. 클라이언트 금액을 쓰지 않는다 | `PaymentCoreService.confirm()` |
| **상태 전이** — `CREATED → CONFIRMING | CANCELLED | FAILED` · `CONFIRMING → PAID | FAILED` · `PAID → REFUNDED` · 나머지 terminal | `PaymentStateMachine.ts` |
| **동시 confirm 차단** — `CREATED → CONFIRMING` 을 조건부 UPDATE(`WHERE id AND status = fromStatus`)로 원자 전이, 실패 시 `PAYMENT_ALREADY_PROCESSING` | `TypeORMPaymentRepository.transitionStatus()` |
| **`paymentKey` 유일성** — `o4o_payments."paymentKey"` partial UNIQUE index | `IDX_o4o_payments_paymentKey_unique` |
| **결제 이벤트** — PaymentCore 는 `payment.initiated` · `completed` · `failed` · `cancelled` · `refunded` 를 발행하지만, **도메인 handler 가 구독할 수 있는 것은 `payment.completed` · `payment.failed` 뿐**이다. 나머지 3종은 `EventHubPaymentPublisher` 가 로그만 남기고 `PaymentEventHub` 로 전달하지 않는다 | `EventHubPaymentPublisher.publish()` · `PaymentEventHub` |
| **새 PG · 새 payment engine · 새 payment table · 새 상태머신 금지** — 결제는 PaymentCore 를 재사용한다 | `b2b-payment-controller.factory.ts` 절대 기준 |

### 2-3. 결제 이벤트 처리

- B2B handler(`StoreB2bCheckoutPaymentEventHandler` · `NetureB2bCheckoutPaymentEventHandler` · `PharmacyHubPaymentEventHandler`)는 `payment.completed` 를 받아 `checkout_order` 를 paid 로 전이한다.
- 취소 · 환불 이벤트를 받는 handler 는 현재 만들 수 없다(위 §2-2 — hub 미전달). 필요해지면 publisher 변경을 포함한 별도 WO 로 한다.
- 전이는 payable 상태에 한정되고 idempotent 해야 한다. cancelled · refunded 주문은 전이 · bridge 대상이 아니다.
- fulfillment bridge(`CheckoutFulfillmentBridgeService`)는 `neture_orders.metadata->>'checkoutOrderId'` 를 먼저 조회하고, 생성 트랜잭션 안에서 주문별 `pg_advisory_xact_lock` 을 잡은 뒤 다시 조회해 없을 때만 생성한다. 그래서 이 service 를 거치는 동시 실행(결제 이벤트 · 결제 확인 재요청 · 수동 recovery)은 직렬화된다. 다만 이 JSON 키에 **UNIQUE 제약은 없다** — 이 service 밖에서 `neture_orders` 를 만드는 경로는 이 보장에 포함되지 않는다. DB 제약 수준의 보장은 Stable 계약이 아니며, 필요하면 schema 변경을 포함한 별도 WO 로 한다.
- 결제 완료 단계에서 재고를 차감하지 않는다. 수량을 checkout 단계에서 **원자적으로 확보하는 것은 Event Offer 수량뿐**이다 — Event Offer 경로(`EventOfferCartCheckoutService`)와 Neture 약국 매장의 이벤트 행(`reserveEventOfferListing`). Neture 약국 매장의 일반 공급(SPO) 행은 가용 재고를 검증만 한다. 그 밖의 B2B 경로 — 승인축 B2B(KPA Society `store_b2b_cart`, `StoreB2BCartCheckoutService` — K-Cosmetics 는 퇴역 잔여로 현행 축 아님, 2026-10-07) · Neture B2B(`NetureB2BCartCheckoutService`) · PharmacyHub(`PharmacyHubCartCheckoutService`) — 는 공통 `B2BCheckoutConfirmCore.confirm()` 에서 `track_inventory` 상품의 가용 재고(`stock_quantity - reserved_quantity`)를 검증만 하고 예약하지 않는다. 따라서 이 세 경로와 Neture 약국 매장 SPO 행의 동시 주문 초과 판매 방지는 이 Stable 계약에 포함되지 않으며, 필요하면 별도 WO 로 정한다.

### 2-4. 매장 서비스 구독 결제

- `/store-entitlements/subscriptions/{prepare,confirm}`(`modules/store-entitlement/store-entitlement.routes.ts`)는 같은 PaymentCore 계약(서버 금액 · 상태머신 1회 confirm)을 쓴다. 금액은 plan catalog(`store-service-subscription-plan-catalog`)가 정하고, 승인 후 이용권을 생성하거나 연장한다.
- 이것은 B2B 주문이 아니라 매장이 플랫폼 서비스 이용료를 내는 결제다. 소비자 commerce 가 아니다.

## 3. Stable 범위가 아닌 것

| 대상 | 분류 | 근거 |
|---|---|---|
| 공개 매장 상품 조회 `GET /:slug/products/:id`(B2C visibility gate) — 소비처 = KPA QR 상품 랜딩 | **정보 표시**(ACTIVE) — checkout 이 아니다 | COMMERCE-BOUNDARY §4 |
| 태블릿 상품 노출 | 정보 표시 — `TABLET` 채널 게이트 | COMMERCE-BOUNDARY §4 |
| V1 의 "Storefront 4중 게이트" · "Checkout 7중 검증(B2C)" · "판매 · 결제 축 Stable 달성" | 은퇴 — 소비자 결제 410 | V1 · COMMERCE-BOUNDARY §2 · §12 |
| 소비자 결제 · 주문 경로(`/kpa/payments/*` · 소비자 주문 생성. `/cosmetics/payments/*` 는 퇴역 1차-B 로 삭제) | LEGACY_COMMERCE — **복구 · 확장 금지** | COMMERCE-BOUNDARY §8 · §9 · §10 |

정보 표시 경로는 동결 대상이 아니므로 일반 WO 로 고친다. 단 그 경로에 cart · checkout · 결제를 붙이는 것은 COMMERCE-BOUNDARY §15 절차 없이 할 수 없다.

## 4. 바꾸려면

- §2 의 규칙을 바꾸는 변경(상태 전이 · 금액 검증 위치 · `paymentKey` 제약 · 이벤트 계약 · 새 결제 경로)은 명시적 WO 가 필요하다.
- 버그 수정 · 테스트 · 문서는 허용한다.

---

*Created: 2026-10-06 · Version 2.0 · Status: ACTIVE*
