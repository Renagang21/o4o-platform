# O4O Retail Stable v1.0 — Platform Architecture Freeze

> ---
>
> **[2026-08-25 · Business Boundary 정합 표기]**
> 본 문서가 기술하는 `Hub → Storefront → Checkout → Payment → Order` closed loop 은
> `organization_channels.channel_type = 'B2C'` 를 게이트로 사용한다 — 즉 **매장(약국) 조직을
> 상대로 소비자가 O4O 안에서 결제하는 경로**다.
>
> 이는 canonical business boundary 문서
> [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) §2 · §12 의
> "매장 경영자는 O4O를 이용하여 소비자에게 판매하지 않는다" 원칙과 **충돌 후보**다.
>
> 실제로 이 loop 의 **결제 leg 은 이미 차단되어 있다** — `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1`
> 이 glycopharm · cosmetics · kpa 의 payment prepare/confirm 을 `410 STORE_SALE_PAYMENT_DEPRECATED`
> 로 막았다. 즉 본 문서가 기술하는 "폐쇄 루프"는 현재 문서 그대로 동작하지 않는다.
>
> 본 표기는 판정이 아니다. 해당 문서 §8 판정 절차(producer / consumer / production 사용 여부)를
> 거치기 전까지 이 loop 은 `UNKNOWN` 이며, **기능을 복구·확장하지 않는다.**
> 본 문서의 FROZEN 상태와 본문은 변경하지 않았다.
>
> ---


> **Status**: FROZEN
> **Effective**: 2026-02-16
> **Authority**: CLAUDE.md Section 13-A (Retail Stable Rule)

---

## 1. Overview

O4O Retail Stable v1.0은 구조적으로 검증 완료된 폐쇄 루프(Closed Loop)이다.
Hub → Storefront → Checkout → Payment → Event → Order 전이가 단일 게이트 정의 위에서 동작한다.

이 문서는 Work Order도 아니고, IR 보고서도 아니며, 설계 초안도 아닌
**플랫폼 아키텍처 고정 문서**이다.

---

## 2. Visibility Gate (단일 정의)

모든 구간에서 동일한 4중 조건을 사용한다:

```sql
opl.is_active = true          -- organization_product_listings
opc.is_active = true          -- organization_product_channels
oc.status = 'APPROVED'        -- organization_channels (channel_type = 'B2C')
p.status = 'active'           -- glycopharm_products
```

### 적용 구간

| 구간 | 파일 | 적용 방식 |
|------|------|----------|
| Hub KPI | `store-hub.controller.ts` | COUNT FILTER |
| Storefront | `store.controller.ts` → `queryVisibleProducts()` | 4-way INNER JOIN |
| Checkout | `checkout.controller.ts` | Channel query + mapping query + product validation |
| Confirm 재검증 | `GlycopharmPaymentEventHandler.ts` → `checkSalesLimitBeforePaid()` | Channel mapping query |

### 변경 금지

이 4개 조건의 추가/삭제/수정은 **모든 적용 구간을 동시에 변경해야** 하며,
반드시 설계 WO → IR 재검증을 거쳐야 한다.

---

## 3. Sales Limit Protection

### 계산 기준

```sql
WHERE o.status = 'PAID'
```

- CREATED 주문은 한도 소모로 간주하지 않음
- CANCELLED 주문은 자동 제외
- 한도 차감은 결제 완료(PAID) 시점 기준

### 동시성 보호

| 보호 계층 | 위치 | 메커니즘 |
|----------|------|---------|
| Checkout | `checkout.controller.ts` | QueryRunner Transaction + `FOR UPDATE OF o` |
| Confirm | `GlycopharmPaymentEventHandler.ts` | `checkSalesLimitBeforePaid()` 재검증 |
| Payment | `PaymentCoreService.ts` | `transitionStatus()` atomic UPDATE WHERE |

### 흐름

```
Checkout: SELECT SUM(qty) WHERE status='PAID' FOR UPDATE
  → 한도 내 → 주문 생성 (CREATED)
  → 한도 초과 → 400 SALES_LIMIT_EXCEEDED

Confirm: checkSalesLimitBeforePaid()
  → 한도 내 → Order PAID
  → 한도 초과 → Order CANCELLED + PaymentStatus FAILED
```

---

## 4. Payment Core (Execution Core)

### 구조

- PaymentCoreService: 상태 전이 엔진 (서비스 무관)
- PaymentRepository: 추상 인터페이스 (TypeORM 어댑터)
- PaymentEventHub: 서비스별 이벤트 라우팅

### 핵심 계약

| 항목 | 고정 값 |
|------|--------|
| UUID 전달 | `confirm(paymentId, paymentKey, orderId, amount, internalOrderId)` |
| Event orderId | `internalOrderId` (UUID) 우선 |
| Atomic 전이 | `transitionStatus(id, 'CREATED', 'CONFIRMING')` |
| paymentKey | UNIQUE constraint (partial index, NULL 허용) |
| Idempotent | 중복 paymentKey → 200 기존 결과 반환 |
| Race 보호 | `PAYMENT_ALREADY_PROCESSING` → 409 |

---

## 5. Orphan Prevention

### TTL Policy

| 항목 | 값 |
|------|------|
| 대상 | `status='created'`, `orderType='RETAIL'`, `serviceKey='glycopharm'` |
| TTL | 15분 |
| 동작 | `status → 'cancelled'` |
| Endpoint | `POST /checkout/cleanup-expired` |

### Late Payment Guard

```
Payment event arrives → order.status 확인
  → CREATED / PENDING_PAYMENT → 처리 진행
  → CANCELLED / PAID / 기타 → 거부 (action: 'failed')
```

CANCELLED 주문은 절대 PAID로 전이되지 않는다.

---

## 6. Layer Separation

| Layer | 경로 | 인증 | 역할 |
|-------|------|------|------|
| Hub | `/pharmacy/cockpit`, `/pharmacy/hub` | requireAuth + pharmacy owner | 운영 KPI, QuickAction |
| Storefront | `/stores/:slug` | Public (GET), authenticate (PUT) | 소비자 상품 노출 |
| Checkout | `/checkout` | requireAuth | 주문 생성, TTL cleanup |
| Payment | `/payments` | requireAuth + buyer ownership | prepare → confirm → query |
| Event | Internal (PaymentEventHub) | N/A | payment.completed → Order PAID |

### Cross-Contamination Matrix

모든 계층 간 직접 서비스 호출: **0건**

---

## 7. Verification Trail

| 단계 | 문서 | 결과 |
|------|------|------|
| V1 조사 | IR-STORE-HUB-TO-STOREFRONT-END-TO-END-V1 | FAIL (sales_limit, visibility) |
| Sales Limit 수정 | WO-O4O-SALES-LIMIT-HARDENING-V1 | 3 Phase 완료 |
| Visibility Gate 수정 | WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1 | 5 Phase 완료 |
| Payment 안정화 | WO-O4O-PAYMENT-CORE-STABILIZATION-V1 | P0-1,2,3 완료 |
| Checkout 동기화 | WO-O4O-CHECKOUT-VISIBILITY-SYNC-V1 | opl.is_active 보정 |
| V2 재검증 | IR-STORE-HUB-TO-STOREFRONT-END-TO-END-V2 | **PASS** |

---

## 8. Change Policy

이 문서에 기술된 구조를 변경하려면:

1. **설계 Work Order 작성** (변경 사유, 영향 범위, 대안)
2. **IR 조사** (현재 상태 확인)
3. **WO 구현** (최소 변경 원칙)
4. **IR 재검증** (전 구간 게이트 일관성 확인)

직접 코드 수정은 금지한다.

---

*Created: 2026-02-16*
*Version: 1.0*
*Status: FROZEN*
