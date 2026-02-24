# IR-O4O-CHECKOUT-END-TO-END-STRUCTURE-V1

**Checkout End-to-End 구조 정합성 조사 보고서**

| 항목 | 값 |
|------|------|
| WO | WO-O4O-CHECKOUT-END-TO-END-STRUCTURE-AUDIT-V1 |
| 작성일 | 2026-02-24 |
| 상태 | 완료 |
| 유형 | 읽기 전용 조사 (코드 수정 없음) |

---

## 1. 전체 흐름 다이어그램

```
┌──────────────────────────────┐
│ 1. Product Master            │  neture_supplier_products
│    status: ACTIVE            │  distribution_type: PUBLIC
│    supplier.status: ACTIVE   │  is_active: true
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 2. Application (신청)        │  organization_product_applications
│    status: pending           │  pharmacy owner → POST /apply
│    → approved / rejected     │  operator → PATCH /:id/approve
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 3. Listing (진열)            │  organization_product_listings
│    is_active: true/false     │  승인 시 자동 생성 (is_active=false)
│    retail_price: N           │  owner가 활성화/가격 설정
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 4. Storefront 노출           │  4중 게이트 쿼리 (INNER JOIN)
│    Gate 1: opl.is_active     │  organization_product_listings
│    Gate 2: opc.is_active     │  organization_product_channels
│    Gate 3: oc.status=APPROVED│  organization_channels
│    Gate 4: p.status=active   │  glycopharm_products
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 5. Checkout Order 생성       │  ecommerce_orders (status=CREATED)
│    7개 검증 게이트            │  트랜잭션 + FOR UPDATE lock
│    Sales limit 1차 검증      │  PAID 기준 카운트
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 6. Payment Confirm           │  o4o_payments
│    Toss PG 승인              │  CREATED → CONFIRMING → PAID
│    금액 검증                  │  order.totalAmount === amount
│    Atomic state transition   │  transitionStatus() WHERE clause
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 7. Order Finalize            │  Event: PAYMENT_COMPLETED
│    Sales limit 2차 검증      │  PAID 기준 재카운트
│    status → PAID             │  paymentStatus → PAID
│    중복 처리 방지             │  Set-based dedup (1시간 TTL)
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 8. Cancel / Refund           │  TTL: 15분 (CREATED→CANCELLED)
│    환불: PAID → REFUNDED     │  Toss refund API 호출
└──────────────────────────────┘
```

---

## 2. 각 단계별 게이트 조건 표

### A. 상품 승인 게이트

| 단계 | 테이블 | 조건 | 파일 |
|------|--------|------|------|
| 카탈로그 노출 | `neture_supplier_products` | `distribution_type='PUBLIC' AND is_active=true` | pharmacy-products.controller.ts:152 |
| 공급자 활성 | `neture_suppliers` | `status='ACTIVE'` | pharmacy-products.controller.ts:156 |
| 중복 신청 차단 | `organization_product_applications` | `status NOT IN ('pending','approved')` | pharmacy-products.controller.ts:242-262 |
| 승인 → 진열 | `organization_product_applications` | `status='pending'` (승인 전) | operator-product-applications.controller.ts:125 |

**상태 전이:**
```
Application:  pending → approved  (→ Listing 자동 생성, is_active=false)
              pending → rejected  (사유 기록, Listing 미생성)
```

### B. Storefront 노출 게이트 (4중 방어)

| Gate | 테이블 | 컬럼 | 조건 | 역할 |
|------|--------|------|------|------|
| Gate 1 | `organization_product_listings` | `is_active` | `= true` | 약국 owner 판매 중지 |
| Gate 2 | `organization_product_channels` | `is_active` | `= true` | 채널별 노출 제어 |
| Gate 3 | `organization_channels` | `status` | `= 'APPROVED'` | 채널 승인 상태 |
| Gate 4 | `glycopharm_products` | `status` | `= 'active'` | 상품 활성 상태 |

**적용 파일:**

| 엔드포인트 | 파일 | 4중 게이트 |
|-----------|------|-----------|
| `GET /:slug/products` | unified-store-public.routes.ts:487 | PASS |
| `GET /:slug/products/featured` | unified-store-public.routes.ts:439 | PASS |
| `GET /:slug/products/:id` | unified-store-public.routes.ts:512 | PASS |
| `GET /:slug/categories` | unified-store-public.routes.ts:542 | PASS |
| `GET /:slug/tablet/products` | unified-store-public.routes.ts:746 | PASS |
| `GET /stores/:slug/products` | store.controller.ts:347 | PASS |
| `GET /stores/:slug/products/featured` | store.controller.ts:300 | PASS |
| `GET /stores/:slug/products/:id` | store.controller.ts:384 | PASS |
| `GET /stores/:slug/categories` | store.controller.ts:241 | PASS |

**판정: 모든 Storefront 상품 엔드포인트에서 4중 게이트 일관 적용됨**

### C. Checkout 생성 게이트 (7중 검증)

| # | 검증 | 테이블/로직 | 파일:라인 |
|---|------|-----------|----------|
| 1 | 약국 활성 | pharmacy exists & active | glycopharm-checkout.ts:276 |
| 2 | 공급 계약 | `neture_supplier_requests` APPROVED | checkout-guard.service.ts:37 |
| 3 | B2C 채널 승인 | `organization_channels` status=APPROVED | glycopharm-checkout.ts:297 |
| 4 | 상품 존재+활성 | `glycopharm_products` status='active' | glycopharm-checkout.ts:315-329 |
| 5 | 재고 확인 | stock_quantity >= quantity | glycopharm-checkout.ts:340 |
| 6 | 채널-상품 매핑 | `organization_product_channels` + opl | glycopharm-checkout.ts:357 |
| 7 | Sales limit 1차 | PAID 기준 카운트 + `FOR UPDATE` lock | glycopharm-checkout.ts:434-466 |

**트랜잭션:** QueryRunner 사용, 실패 시 ROLLBACK

### D. Payment Confirm 게이트

| # | 검증 | 로직 | 파일:라인 |
|---|------|------|----------|
| 1 | 필수 파라미터 | paymentKey, orderId, amount | glycopharm-payment.ts:162 |
| 2 | 주문 소유권 | buyerId === userId | glycopharm-payment.ts:184 |
| 3 | 금액 일치 | order.totalAmount === request.amount | glycopharm-payment.ts:193 |
| 4 | 결제 가능 상태 | CREATED or PENDING_PAYMENT | glycopharm-payment.ts:114 |
| 5 | Atomic 전이 | transitionStatus(CREATED→CONFIRMING) | PaymentCoreService.ts:119-132 |
| 6 | Toss PG 승인 | provider.confirm() 외부 API | PaymentCoreService.ts:141 |
| 7 | paymentKey 유일성 | UNIQUE constraint (partial) | Migration 1771027200001 |

### E. Order Finalize 게이트 (Event Handler)

| # | 검증 | 로직 | 파일:라인 |
|---|------|------|----------|
| 1 | 중복 처리 방지 | Set `${paymentId}:${orderId}` (1시간 TTL) | GlycopharmPaymentEventHandler.ts:76 |
| 2 | 주문 존재 | order exists | GlycopharmPaymentEventHandler.ts:109 |
| 3 | 결제 가능 상태 | NOT already PAID/CONFIRMED | GlycopharmPaymentEventHandler.ts:131 |
| 4 | Sales limit 2차 | PAID 기준 재카운트 | GlycopharmPaymentEventHandler.ts:185-246 |

**Sales limit 2차 검증 실패 시:** order.status=CANCELLED, paymentStatus=FAILED (이미 결제된 주문도 취소)

---

## 3. DB 조건 정리

### 주요 테이블 스키마

| 테이블 | 핵심 상태 필드 | 값 | 용도 |
|--------|---------------|------|------|
| `neture_supplier_products` | `is_active`, `distribution_type`, `purpose` | bool, PUBLIC/PRIVATE, CATALOG/APPLICATION/ACTIVE_SALES | B2B 카탈로그 |
| `neture_suppliers` | `status` | ACTIVE/INACTIVE | 공급자 상태 |
| `organization_product_applications` | `status` | pending/approved/rejected | 상품 신청 |
| `organization_product_listings` | `is_active` | bool | 진열 상태 |
| `organization_product_channels` | `is_active`, `sales_limit` | bool, int/null | 채널별 제어 |
| `organization_channels` | `status` | PENDING/APPROVED/REJECTED/SUSPENDED/EXPIRED/TERMINATED | 채널 승인 |
| `glycopharm_products` | `status` | draft/active/discontinued/out_of_stock | 상품 상태 |
| `ecommerce_orders` | `status`, `paymentStatus` | 아래 참조 | 주문 |
| `o4o_payments` | `status` | CREATED/CONFIRMING/PAID/FAILED/CANCELLED/REFUNDED | 결제 |

### FK 제약

| 관계 | 동작 |
|------|------|
| listing → kpa_organizations | ON DELETE RESTRICT (조직 삭제 차단) |
| channel → organization | ON DELETE CASCADE |
| order → users (buyer) | ON DELETE CASCADE |

---

## 4. 상태 전이 다이어그램

### Order Status
```
CREATED ──→ PENDING_PAYMENT ──→ PAID ──→ CONFIRMED ──→ PROCESSING
   │                              │         │              │
   │                              │         │              ↓
   ↓                              ↓         ↓          SHIPPED → DELIVERED → COMPLETED
CANCELLED                     REFUNDED  REFUNDED
(TTL 15분 자동)
```

### Payment Status (PaymentCore)
```
CREATED ──→ CONFIRMING ──→ PAID ──→ REFUNDED
   │             │
   ↓             ↓
CANCELLED     FAILED
```

### Payment Status (Order-level)
```
PENDING ──→ PAID ──→ REFUNDED
               │
               ↓
          PARTIAL_REFUND
```

### Application Status
```
pending ──→ approved   (→ Listing 자동 생성)
   │
   ↓
rejected   (→ 재신청 가능: 새 application 생성)
```

---

## 5. 잠재 리스크 목록

| # | 리스크 | Severity | 설명 | 현재 방어 |
|---|--------|----------|------|----------|
| R1 | 금액 위변조 | **Medium** | PaymentCore.confirm()이 프론트엔드 amount를 그대로 Toss에 전달 | GlycoPharm controller에서 `order.totalAmount === amount` 사전 검증으로 방어됨. 단, PaymentCore 자체에는 방어 없음 |
| R2 | Sales limit 초과 후 결제 취소 | **Low** | Payment delay 중 다른 주문이 limit 소진 → PAID 주문이 CANCELLED됨 | 2차 검증으로 방어하나, 이미 결제된 금액의 자동 환불 로직 부재 |
| R3 | Supplier INACTIVE 시 기존 Listing 유지 | **Low** | 공급자 비활성화해도 기존 listing/channel 매핑은 그대로 → Storefront 노출 지속 | Gate 4 (`p.status='active'`)가 개별 상품 수준에서 방어. 공급자 레벨 일괄 차단은 수동 |
| R4 | TTL cleanup 수동 트리거 | **Low** | CREATED 상태 15분 이상 방치 주문이 cron 없이 수동 호출 의존 | POST /checkout/cleanup-expired 존재하나 자동 스케줄 미확인 |
| R5 | Cosmetics 서비스 Sales limit 미검증 | **Medium** | KCosmeticsPaymentEventHandler에 sales limit 2차 검증 없음 | Cosmetics 서비스에 sales limit 기능이 아직 없으므로 현재 영향 없음. 향후 추가 시 누락 위험 |
| R6 | 재고 차감 미구현 | **Info** | `stock_quantity` 검증은 하지만 결제 후 차감 로직 없음 | 현재 재고 관리가 외부 시스템 의존으로 추정 |
| R7 | Event handler 메모리 기반 중복 방지 | **Low** | Set 기반 dedup이 인스턴스 재시작 시 초기화됨 | Order status 체크 (`NOT already PAID`)가 2차 방어 |

---

## 6. 구조적 불일치 여부 판정

### 일관성 확인 결과

| 항목 | 판정 | 비고 |
|------|------|------|
| Storefront 4중 게이트 | **일관** | 모든 상품 엔드포인트에서 동일 쿼리 패턴 사용 |
| Checkout 검증 → Storefront 게이트 정합 | **일관** | Checkout이 Storefront보다 더 많은 게이트 적용 (7 > 4) |
| Sales limit 기준 | **일관** | `status='PAID'` 기준 일관 적용 (Checkout + Finalize) |
| Payment atomic transition | **일관** | transitionStatus() + WHERE clause로 동시성 방어 |
| ServiceKey 격리 | **일관** | Controller 레벨에서 sellerId/organizationId 바인딩 |
| 서비스 간 Event 격리 | **일관** | `serviceKey` 필터로 handler 분리 |

### 구조적 불일치 (Minor)

| 항목 | 내용 |
|------|------|
| PaymentCore vs Service 레이어 금액 검증 | PaymentCore 자체에 금액 검증 없음 (service controller에서 수행) |
| GlycoPharm vs Cosmetics 검증 수준 | GlycoPharm: Sales limit 2차 검증 있음 / Cosmetics: 없음 |
| Cosmetics Payment 경로 | Toss API 직접 호출 (PaymentCore 미사용 구간 존재) |

---

## 7. Stable 여부 판정

### 판정: **Conditionally Stable**

| 영역 | 상태 | 근거 |
|------|------|------|
| Storefront 4중 게이트 | **Stable** | 모든 엔드포인트 일관 적용, 우회 경로 없음 |
| Checkout 검증 | **Stable** | 7중 게이트 + 트랜잭션 + FOR UPDATE lock |
| Payment 상태 전이 | **Stable** | Atomic transition + UNIQUE constraint + dedup |
| Sales limit 방어 | **Stable** | 2차 검증 (Checkout + Finalize) |
| ServiceKey 격리 | **Stable** | Controller 바인딩으로 cross-service 불가 |
| 금액 위변조 방지 | **Conditional** | Service 레이어에서 방어 중이나, PaymentCore에 미포함 |
| 자동 환불 (limit 초과) | **Gap** | 결제 후 limit 초과 취소 시 Toss 환불 자동 호출 미확인 |

### 전체 판정

**Checkout End-to-End 흐름은 구조적으로 안정(Stable)하며, Retail Stable v1.0 아키텍처와 정합한다.**

Minor gaps (R1 PaymentCore 금액 검증, R2 자동 환불)은 서비스 레이어 방어로 현재 운영에 지장 없으나, PaymentCore 강화 시 반영 권장.

---

## 8. 핵심 파일 참조

| 구분 | 파일 |
|------|------|
| **Storefront (통합)** | `apps/api-server/src/routes/platform/unified-store-public.routes.ts` |
| **Storefront (KPA)** | `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` |
| **상품 신청** | `apps/api-server/src/routes/kpa/controllers/pharmacy-products.controller.ts` |
| **신청 승인** | `apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts` |
| **Checkout** | `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts` |
| **Checkout Guard** | `apps/api-server/src/core/checkout/checkout-guard.service.ts` |
| **Checkout Service** | `apps/api-server/src/services/checkout.service.ts` |
| **Payment Controller** | `apps/api-server/src/routes/glycopharm/controllers/glycopharm-payment.controller.ts` |
| **PaymentCore** | `packages/payment-core/src/services/PaymentCoreService.ts` |
| **Event Handler (GlycoPharm)** | `apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts` |
| **Event Handler (Cosmetics)** | `apps/api-server/src/services/cosmetics/KCosmeticsPaymentEventHandler.ts` |
| **Order Entity** | `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` |
| **Payment Entity** | `apps/api-server/src/entities/payment/PlatformPayment.entity.ts` |
| **Listing Entity** | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` |
| **Channel Entity** | `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` |
| **Product Channel Entity** | `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` |
| **Application Entity** | `apps/api-server/src/routes/kpa/entities/organization-product-application.entity.ts` |
| **Store Hub KPI** | `apps/api-server/src/routes/kpa/controllers/store-hub.controller.ts` |
| **Retail Stable Spec** | `docs/platform/architecture/O4O-RETAIL-STABLE-V1.md` |

---

*Investigation Report: IR-O4O-CHECKOUT-END-TO-END-STRUCTURE-V1*
*Status: Complete*
*Date: 2026-02-24*
