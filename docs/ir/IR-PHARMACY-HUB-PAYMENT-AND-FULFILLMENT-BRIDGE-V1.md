# IR-PHARMACY-HUB-PAYMENT-AND-FULFILLMENT-BRIDGE-V1

> 조사일: 2026-08-01 · 브랜치 `main` · HEAD `951567cb3`
> **read-only 조사 — 코드 변경 0 · migration 0 · DB write 0**

---

## 요약 (결론 먼저)

조사 착수 시점의 가정("bridge 가 아직 없다")은 **틀렸다.** Neture B2B 는 이미 P2a→P2b→P2c 가
모두 구현되어 **결제 완료 → 공급자 fulfillment 노출까지 동작하는 체인**을 갖고 있다.
따라서 Pharmacy-Hub 는 그 체인을 따라가면 되고, **결제 SSOT·fulfillment SSOT·신규 테이블 문제는 없다.**

다만 **단 하나의 구조적 결함**이 남는다:

> **fulfillment 원장(`neture_orders`)과 공급자 조회에 서비스 축이 없다.**
> 공급자 주문 조회는 `spo.supplier_id` 단일 조건이라, Pharmacy-Hub 주문을 bridge 하면
> **기존 Neture 공급자 workspace 에 그대로 혼입**되고 통계(`today_orders` 등)에도 합산된다.

이것이 유일한 중지 조건 해당 사항이며, **권고는 B안 + 선행 WO 1건**이다 (§7).

---

## 1. 현재 결제 흐름 (Neture B2B, 실측)

```
POST /api/v1/neture/b2b/payment/prepare
   → PaymentCoreService.prepare({ sourceService: 'neture-b2b', ... })
   → 단일 orderId  XOR  다중 공급자 paymentGroupId
POST /api/v1/neture/b2b/payment/confirm
   → PaymentCoreService.confirm(paymentId, paymentKey, orderId, internalOrderId)
   → payment.completed (serviceKey='neture-b2b') 발행
```

### 1-1. 결제 완료 SSOT — **확정됨**

`packages/payment-core/src/services/PaymentCoreService.ts#confirm()` 단일 지점.

| 안전장치 | 내용 |
|---|---|
| 금액 위변조 | **prepare 시 서버가 저장한 `payment.amount` 로 PG 승인.** 프론트 금액 미사용 |
| 동시성 | `transitionStatus(CREATED → CONFIRMING)` **원자 전이**. 실패 시 `PAYMENT_ALREADY_PROCESSING` |
| 상태 계약 | `assertTransition` 으로 허용 전이만 |

→ 중지 조건 "결제 완료를 서버가 확정하는 단일 지점이 없음" **미해당**.

### 1-2. 다중 공급자 결제 단위 — **이미 해결됨**

`WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1` 으로 **paymentGroupId** 축이 존재한다.
공급자별로 분리된 N개의 `checkout_orders` 를 **한 번의 결제**로 묶고,
이벤트 수신 시 `metadata->>'paymentGroupId'` 로 되찾아 N건을 함께 전이·bridge 한다.

→ Pharmacy-Hub 의 공급자별 주문 분리 구조와 **그대로 맞는다**.

### 1-3. 이벤트 → 주문 전이

`services/payment/PaymentEventHub.ts` — `payment.completed` / `payment.failed` 에 `serviceKey` 필드.
서비스별 핸들러가 **자기 serviceKey 만 구독**한다 (kpa / glycopharm / k-cosmetics / neture / **neture-b2b** / lms).

`NetureB2bCheckoutPaymentEventHandler`:
- `serviceKey='neture-b2b'` 구독 (legacy `'neture'` 핸들러와 분리 → 충돌 없음)
- **2차 안전장치**: `metadata.source='neture_b2b_checkout'` 인 checkout_order 만 전이(오발 방지)
- 단일 주문 / paymentGroup 양쪽 처리

---

## 2. 현재 fulfillment 흐름 (실측)

```
checkout_order (paid)
  → CheckoutFulfillmentBridgeService.bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId })
  → neture_orders + neture.neture_order_items 생성
  → 공급자 workspace 가 조회 (supplier-order.service)
```

### 2-1. Bridge 가드 (payment-first)

| 가드 | 값 |
|---|---|
| source | `metadata.source === 'neture_b2b_checkout'` 아니면 `UNSUPPORTED_SOURCE` |
| 결제 | `payment_status='paid' && status='paid' && paid_at NOT NULL` 아니면 `PAYMENT_NOT_READY` |
| 멱등 | `neture_orders.metadata->>'checkoutOrderId'` 존재 시 **중복 생성 금지** |
| 결과 | `status=PAID` · `paid_at` · `metadata.paymentReady=true` → fulfillment/settlement readiness guard 통과 |

### 2-2. 공급자 노출 축

```sql
FROM neture_orders o
JOIN neture.neture_order_items oi ON oi.order_id = o.id
JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
WHERE spo.supplier_id = $1
```

공급자 스코프는 **`neture_order_items.product_id (= SupplierProductOffer.id)` → `spo.supplier_id`**.
Pharmacy-Hub 주문도 같은 SPO 를 쓰므로 **연결 키는 이미 호환된다**.

### 2-3. fulfillment SSOT — **단일**

공급자 접수·상태 전이·shipment 는 전부 `neture_orders` / `neture_order_items` / `neture_shipments` 축이다.
→ 중지 조건 "공급자 fulfillment SSOT 가 둘 이상임" **미해당**.

---

## 3. 두 원장 사이의 단절 지점 (Pharmacy-Hub 기준)

| # | 단절 | 성격 |
|---|------|------|
| 1 | **결제 진입점 없음** — Pharmacy-Hub 용 prepare/confirm 컨트롤러 부재 | 신규 구현 (기존 패턴 복제) |
| 2 | **이벤트 핸들러 없음** — `serviceKey='pharmacy-hub'` 구독자 부재 | 신규 구현 (기존 패턴 복제) |
| 3 | **bridge source 하드 필터** — `md.source !== 'neture_b2b_checkout'` → skip. Pharmacy-Hub 는 `source='pharmacy_hub_cart'` | 파라미터화 또는 전용 adapter |
| 4 | **⚠️ fulfillment 원장에 서비스 축 없음** | **구조적 결함 — §4 참조** |

---

## 4. ⚠️ 유일한 구조적 결함 — 공급자 workspace 혼입

`neture_orders` 엔티티에는 **serviceKey 컬럼이 없다** (`order_type` 은 STORE_RESTOCK 등 거래모델 축이지 서비스 축이 아니다).
공급자 조회·통계 쿼리도 `spo.supplier_id` 하나만 건다.

그 결과 Pharmacy-Hub 주문을 bridge 하면:

- 공급자가 **하나의 Neture workspace 에서 Neture 주문과 Pharmacy-Hub 주문을 섞어** 보게 된다
- `today_orders` · `pending_processing` · `pending_shipping` · `total_orders` 통계에 **합산**된다
- 즉 **기존 Neture 공급자 계약(조회 결과·집계)이 바뀐다**

이는 A안뿐 아니라 **B안(전용 adapter)도 동일**하다 — 같은 원장에 쓰기 때문이다.
서비스 축을 넣지 않고 bridge 하면 어느 방식이든 혼입이 발생한다.

> 중지 조건 **"공통 bridge 가 기존 Neture 계약을 변경함"** 에 해당한다.
> 다만 **해소 가능**하다 — §7 의 선행 WO 참조. 신규 테이블은 필요 없다.

---

## 5. 재사용 가능한 자산

| 자산 | 재사용 가능성 |
|---|---|
| `PaymentCoreService.prepare/confirm` | ✅ 그대로 — `sourceService='pharmacy-hub'` 만 다르게 |
| Toss adapter · `TypeORMPaymentRepository` · `EventHubPaymentPublisher` | ✅ 그대로 |
| `PaymentEventHub` (serviceKey 구독 모델) | ✅ 그대로 — 신규 serviceKey 추가만 |
| paymentGroupId (다중 공급자 1결제) | ✅ 그대로 — Pharmacy-Hub 분리 주문에 그대로 맞음 |
| `CheckoutFulfillmentBridgeService` | ⚠️ source 필터만 열면 재사용 가능 |
| `neture_orders` / `neture_order_items` / `neture_shipments` | ✅ 원장 재사용 (서비스 축 추가 필요 — §4) |
| 공급자 fulfillment guard · readiness 판정 | ✅ 그대로 |
| SPO ↔ 공급자 연결 키 | ✅ 이미 호환 |
| Phase 1 산출물 (`PharmacyHubCartCheckoutService`) | ✅ `metadata.source='pharmacy_hub_cart'`·`phase='buyer-order-only'` 가 이미 식별자 역할 |

**신규 주문 테이블 불필요** → 중지 조건 "신규 주문 테이블이 필요함" **미해당**.

---

## 6. 서비스·권한 경계 / 멱등성·복구 위험

### 6-1. 서비스 격리

| 축 | 상태 |
|---|---|
| `checkout_orders` | ✅ `metadata->>'serviceKey'` 로 필터 가능 (Phase 1 에서 실측: neture 2 / pharmacy-hub 1, 혼입 0) |
| 약국(구매자) 경계 | ✅ `buyerId` + serviceKey 이중 조건 |
| 공급자 경계 | ✅ `spo.supplier_id` (소유권은 정확) |
| **fulfillment 서비스 경계** | ❌ **없음** — §4 |

### 6-2. 멱등성

| 지점 | 방식 | 평가 |
|---|---|---|
| 결제 confirm 중복 | `transitionStatus(CREATED→CONFIRMING)` 원자 전이 | ✅ 견고 |
| 이벤트 중복 수신 | 핸들러 `processedPayments: Set` (**in-memory**, 1h TTL) | ⚠️ 인스턴스별 · 재배포 시 소멸 |
| bridge 중복 | `neture_orders.metadata->>'checkoutOrderId'` 조회 후 skip | ✅ **DB 기반 — 최종 방어선** |

→ 이벤트 dedupe 가 in-memory 라도 **bridge 단계의 DB 멱등이 최종 방어선**이라 중복 fulfillment 는 생기지 않는다.
→ 중지 조건 "동시 요청·중복 webhook 을 막을 멱등 구조가 없음" **미해당**.

### 6-3. 복구 위험 (결제는 됐는데 bridge 실패)

- `checkout_order` 는 paid 로 남고 `neture_order` 만 없는 상태가 가능하다
- 현재 **자동 재시도 경로가 없다** — bridge 는 이벤트 수신 시 1회만 시도
- 복구는 `bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId })` 재호출로 가능하며 **멱등**하다
- 다만 이를 호출할 **운영 엔드포인트·배치가 없다** → Phase 2 에 "미bridge paid 주문 조회·재시도" 필요

### 6-4. 결제 실패·취소·환불

`payment.failed` 이벤트 핸들러는 존재한다(실패 시 주문 전이). **환불 정책·경로는 이번 조사 범위 밖**이며
Pharmacy-Hub 용 환불 계약은 별도 결정이 필요하다.

---

## 7. 권고 — **B안 + 선행 WO 1건**

### 7-1. 대안 판정

| 안 | 판정 |
|---|---|
| **A. 공통 bridge (serviceKey 기준 일반화)** | ❌ 지금은 부적절. bridge 를 일반화해도 §4 의 원장 서비스 축 부재가 남고, 공통화 과정에서 Neture 전이·통계 경로를 직접 건드리게 된다 |
| **B. Pharmacy-Hub 전용 adapter → 공통 fulfillment 원장** | ✅ **권고.** Phase 1 에서 checkout 을 전용으로 분리한 것과 같은 이유(게이트·계약 분리). 결제 Core·이벤트 허브·원장·guard 는 전부 재사용 |
| **C. 보류** | ❌ 불필요. 결제 SSOT·fulfillment SSOT·멱등 구조가 모두 확정되어 있다 |

### 7-2. 선행 WO (§4 해소) — **먼저**

```
WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1
```

- `neture_orders` 에 **서비스 축**을 부여한다. 신규 컬럼 없이 `metadata.serviceKey` 로 표기하는 방식을 우선 검토
  (bridge 가 이미 `metadata.checkoutOrderId`·`originalSource` 를 쓰고 있어 형태가 맞다)
- 공급자 조회·통계 쿼리에 서비스 필터를 추가하되 **레거시 호환**: `metadata->>'serviceKey'` 가 없으면 `neture` 로 간주
  → 기존 Neture 주문의 조회 결과·집계가 **바뀌지 않아야 한다**(회귀 검증 필수)
- 공급자 workspace 에 서비스 구분(탭 또는 필터)을 노출할지는 UX 판단 사항

이 WO 없이 Pharmacy-Hub 를 bridge 하면 Neture 공급자 화면이 오염된다.

### 7-3. Phase 2 구현 WO — 선행 완료 후

```
WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1
```

범위:

1. `POST /api/v1/pharmacy-hub/store-owner/payment/prepare|confirm`
   — `PaymentCoreService`, `sourceService='pharmacy-hub'`, 단일 주문 XOR paymentGroupId
2. `PharmacyHubCheckoutPaymentEventHandler` — `serviceKey='pharmacy-hub'` 구독,
   2차 안전장치로 `metadata.source='pharmacy_hub_cart'` 확인
3. bridge 진입 — 전용 adapter 가 `CheckoutFulfillmentBridgeService` 를 호출하도록 source 허용치를 넓히거나
   Pharmacy-Hub 전용 진입 메서드 추가 (Neture 경로 무변경)
4. bridge 시 `metadata.serviceKey='pharmacy-hub'` 기입 (선행 WO 의 축)
5. 공급자 주문 목록·상세·상태 처리 — 기존 공급자 API 를 서비스 필터와 함께 사용
6. Phase 1 의 `supplierNotified:false` · `phase:'buyer-order-only'` 표기를 결제 완료 시 갱신
7. 미bridge paid 주문 재시도 경로 (§6-3)

**정책 결정이 남은 항목** (구현 전 확정 필요):
- 환불·취소 정책 (§6-4)
- 결제 수단 범위 (카드/계좌 등)
- 배송비 정책 — Phase 1 은 0 고정이며 공급자 배송정책(`calculateSupplierShippingFee`) 적용 여부 미정

---

## 8. 중지 조건 판정

| 조건 | 판정 |
|---|---|
| 결제 완료를 서버가 확정하는 단일 지점이 없음 | ❌ 미해당 — `PaymentCoreService.confirm` |
| 공급자 fulfillment SSOT 가 둘 이상임 | ❌ 미해당 — `neture_orders` 단일 |
| **공통 bridge 가 기존 Neture 계약을 변경함** | ⚠️ **해당** — §4. **선행 WO 로 해소 가능**(신규 테이블 불필요) |
| 신규 주문 테이블이 필요함 | ❌ 미해당 |
| 결제·환불 정책 결정이 추가로 필요함 | ⚠️ **부분 해당** — 환불·배송비 정책 미정 (§7-3) |
| 동시 요청·중복 webhook 을 막을 멱등 구조가 없음 | ❌ 미해당 — bridge DB 멱등이 최종 방어선 |

→ **곧바로 Phase 2 구현으로 넘어가지 않는다.** 선행 WO(§7-2) + 정책 확정(환불·배송비) 후 진행한다.

---

## 9. 변경 확인

```
코드 변경 0 · migration 0 · DB write 0 · 신규 테이블 0
```

본 조사는 read-only 다. 프로덕션 데이터를 조회하거나 변경하지 않았고, 소스 파일도 읽기만 했다.
산출물은 이 IR 문서 1개뿐이다.
