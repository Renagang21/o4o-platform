# IR-PHARMACY-B2C-COMMERCE-CORE-ANALYSIS-V1

> **Investigation Report**: 약국 B2C → ecommerce-core 연결 사전 분석
> **Status**: COMPLETE
> **Date**: 2026-02-15
> **Code Modification**: FORBIDDEN (읽기 전용 조사)

---

## 1. 조사 목적

기존 ecommerce-core 구조를 조사하여, 약국 B2C가 어떻게 연결될 수 있는지,
무엇을 재사용해야 하는지, 무엇을 절대 건드리면 안 되는지를 명확히 파악한다.

---

## 2. ecommerce-core 패키지 구조

**위치**: `packages/ecommerce-core/`

```
ecommerce-core/
├── src/
│   ├── entities/
│   │   ├── EcommerceOrder.entity.ts          (주문 엔티티)
│   │   ├── EcommerceOrderItem.entity.ts      (주문 항목 엔티티)
│   │   ├── EcommercePayment.entity.ts        (결제 엔티티)
│   │   └── index.ts
│   ├── services/
│   │   ├── EcommerceOrderService.ts          (주문 생성/관리 — create())
│   │   ├── EcommerceOrderQueryService.ts     (공통 조회 서비스)
│   │   ├── EcommercePaymentService.ts        (결제 처리)
│   │   ├── CosmeticsOrderService.ts          (화장품 도메인 서비스)
│   │   ├── pg/TossPaymentsService.ts         (토스 PG)
│   │   └── index.ts
│   ├── controllers/
│   │   ├── order.controller.ts               (NestJS 주문 컨트롤러)
│   │   ├── payment.controller.ts             (NestJS 결제 컨트롤러)
│   │   └── index.ts
│   ├── hooks/
│   │   ├── core-events.ts                    (이벤트 정의)
│   │   └── index.ts
│   ├── lifecycle/
│   │   ├── install.ts / activate.ts / deactivate.ts / uninstall.ts
│   │   └── index.ts
│   ├── backend/index.ts                      (ModuleLoader)
│   ├── manifest.ts
│   └── index.ts
```

---

## 3. 핵심 엔티티 분석

### 3.1 EcommerceOrder (주문)

**테이블**: `ecommerce_orders`

| 컬럼 | 타입 | 용도 | B2C 활용 |
|------|------|------|----------|
| `id` | UUID PK | 주문 식별 | ✅ 그대로 |
| `orderNumber` | varchar(50) UNIQUE | 주문번호 (GP-YYYYMMDD-XXXX) | ✅ 그대로 |
| `buyerId` | UUID INDEX | 구매자 (소비자) | ✅ 그대로 |
| `buyerType` | enum USER/ORGANIZATION | 구매자 유형 | ✅ USER 고정 |
| `sellerId` | UUID INDEX | **판매자 = 약국 조직 ID** | ✅ 핵심 |
| `sellerType` | enum INDIVIDUAL/ORGANIZATION | 판매자 유형 | ✅ ORGANIZATION |
| `orderType` | enum INDEX | 서비스 식별자 | ✅ GLYCOPHARM |
| `status` | enum INDEX | 주문 상태 | ✅ 그대로 |
| `paymentStatus` | enum INDEX | 결제 상태 | ✅ 그대로 |
| `subtotal` | decimal | 소계 | ✅ 그대로 |
| `shippingFee` | decimal | 배송비 | ✅ 그대로 |
| `discount` | decimal | 할인 | ✅ 그대로 |
| `totalAmount` | decimal | 총액 | ✅ 그대로 |
| `currency` | varchar | 통화 (KRW) | ✅ 그대로 |
| `storeId` | UUID nullable INDEX | 스토어 ID | ⚠️ 미사용 가능 |
| `channel` | varchar nullable INDEX | 채널 ('local','travel') | ⚠️ B2C에서 활용 가능 |
| `orderSource` | varchar nullable | 주문 출처 ('online','kiosk') | ✅ B2C 활용 |
| `metadata` | jsonb | 서비스별 확장 데이터 | ✅ 핵심 확장점 |
| `shippingAddress` | jsonb | 배송지 | ✅ 그대로 |

### 3.2 OrderType Enum (현재)

```typescript
export enum OrderType {
  RETAIL = 'retail',            // 일반 소매 (Cosmetics 사용)
  DROPSHIPPING = 'dropshipping', // 드롭쉬핑 (정의됨, 미통합)
  B2B = 'b2b',                  // B2B (Pharma 예정)
  SUBSCRIPTION = 'subscription', // 정기 구독 (미사용)
  GLYCOPHARM = 'glycopharm',    // 약국 O4O ← B2C 사용 중
  LMS = 'lms',                  // LMS 유료 강의 (미사용)
}
```

### 3.3 OrderStatus Enum

```typescript
export enum OrderStatus {
  CREATED, PENDING_PAYMENT, PAID, CONFIRMED,
  PROCESSING, SHIPPED, DELIVERED, COMPLETED,
  CANCELLED, REFUNDED
}
```

### 3.4 PaymentStatus Enum

```typescript
export enum PaymentStatus {
  PENDING, PAID, FAILED, REFUNDED, PARTIAL_REFUND
}
```

### 3.5 EcommerceOrderItem (주문 항목)

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `orderId` | UUID FK | 주문 참조 |
| `productId` | UUID nullable | 내부 상품 ID |
| `externalProductId` | varchar nullable | 외부 상품 ID |
| `productName` | varchar(500) | **스냅샷** — 주문 시점 이름 |
| `sku` | varchar nullable | SKU |
| `options` | jsonb | 옵션 정보 |
| `quantity` | int | 수량 |
| `unitPrice` | decimal | **스냅샷** — 주문 시점 단가 |
| `discount` | decimal | 항목 할인 |
| `subtotal` | decimal | 항목 소계 |
| `status` | enum | 항목별 상태 |
| `metadata` | jsonb | 확장 데이터 |

### 3.6 EcommercePayment (결제)

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `orderId` | UUID FK | 주문 참조 |
| `transactionId` | varchar(100) UNIQUE | 내부 거래 ID |
| `externalPaymentId` | varchar nullable | PG 결제 ID |
| `paymentMethod` | enum | CARD, BANK_TRANSFER, ... |
| `status` | enum | PENDING → COMPLETED → REFUNDED |
| `requestedAmount` | decimal | 요청 금액 |
| `paidAmount` | decimal | 실결제 금액 |
| `refundedAmount` | decimal | 환불 금액 |
| `pgProvider` | varchar | PG사 ('toss') |
| `metadata` | jsonb | PG 응답 데이터 |

---

## 4. checkoutService.createOrder() 분석

### 4.1 CreateOrderDto (입력)

```typescript
interface CreateOrderDto {
  buyerId: string;              // 필수
  buyerType?: BuyerType;        // default: USER
  sellerId: string;             // 필수 — 약국 B2C에서는 pharmacy org ID
  sellerType?: SellerType;      // default: ORGANIZATION
  orderType: OrderType;         // 필수 — GLYCOPHARM
  items: CreateOrderItemDto[];  // 필수 — 최소 1개
  shippingAddress?: ShippingAddress;
  shippingFee?: number;         // default: 0
  discount?: number;            // default: 0
  currency?: string;            // default: 'KRW'
  metadata?: Record<string, any>; // 서비스별 확장
  storeId?: string;
  orderSource?: string;         // 'online', 'in-store', 'kiosk'
  channel?: string;             // 'local', 'travel', etc.
}
```

### 4.2 create() 메서드 흐름

```
1. 금액 계산: items.reduce() → subtotal
2. totalAmount = subtotal + shippingFee - discount
3. orderNumber 생성: "ORD-YYYYMMDD-XXXX"
4. EcommerceOrder 생성 + 저장
5. EcommerceOrderItem[] 생성 + 저장
6. 이벤트 발행: 'order.created'
7. return savedOrder
```

### 4.3 GlycoPharm 체크아웃 (현재 구현)

**파일**: `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts`

**현재 문제**: `EcommerceOrderService.create()` 대신 **직접 repository 사용**

```typescript
// 현재 코드 (직접 repository)
const order = orderRepo.create({
  orderNumber: `GP-${dateStr}-${randomSuffix}`,
  buyerId: authUser.id,
  sellerId: pharmacy.id,              // ← 약국 org ID
  orderType: OrderType.GLYCOPHARM,
  metadata: {
    serviceKey: 'glycopharm',
    pharmacyId: pharmacy.id,
    pharmacyName: pharmacy.name,
    ...
  }
});
await orderRepo.save(order);
```

**비고**: CLAUDE.md §7에서 `OrderType.GLYCOPHARM = BLOCKED`으로 문서화되어 있으나,
실제 코드에서는 **활발히 사용 중**. 문서-코드 불일치.

---

## 5. 서비스별 OrderType 사용 현황

| OrderType | 정의 | 실사용 | 서비스 | 상태 |
|-----------|------|--------|--------|------|
| RETAIL | ✅ | ✅ Cosmetics | CosmeticsOrderService | **Active** |
| DROPSHIPPING | ✅ | ⚠️ Query only | EcommerceOrderQueryService | 미통합 |
| B2B | ✅ | 📋 계획 | PharmaOrderService (Phase 5) | 미구현 |
| SUBSCRIPTION | ✅ | ❌ 없음 | — | 플레이스홀더 |
| GLYCOPHARM | ✅ | ✅ 활성 | GlycoPharm checkout | **Active** (문서 모순) |
| LMS | ✅ | ❌ 없음 | — | 계획됨 |
| COSMETICS | ❌ enum 없음 | N/A | RETAIL 사용 + metadata.channel | 설계 결정 |
| TOURISM | ❌ enum 없음 | N/A | — | 문서만 존재 |

### Cosmetics 패턴 (참조 구현)

```typescript
// CosmeticsOrderService — OrderType = RETAIL 고정
orderType: OrderType.RETAIL,
metadata: {
  channel: 'local' | 'travel',  // ← 채널 구분은 metadata
  fulfillment: 'pickup' | 'delivery',
  storeId, storeName,
  travel?: { guideId, tourSessionId, taxRefund },
  local?: { sampleExperienced, reservationId },
}
```

---

## 6. 결제 흐름 (Toss Payments)

### 6.1 현재 결제 파이프라인

```
1. POST /checkout → EcommerceOrder 생성 (status: CREATED)
2. (프론트) Toss SDK 결제 창 표시
3. POST /checkout/confirm → tossPaymentsService.confirmPayment()
4. 결제 확인 → payment status = PAID, order status = PAID
```

### 6.2 Toss 연동 파일

| 파일 | 용도 |
|------|------|
| `apps/api-server/src/services/toss-payments.service.ts` | PG 통신 |
| `apps/api-server/src/config/payment.config.ts` | 설정 (secretKey, clientKey) |
| `packages/ecommerce-core/src/services/pg/TossPaymentsService.ts` | Core 레벨 PG |

### 6.3 결제 이벤트

```
order.created    → 주문 생성 시
order.confirmed  → 주문 확인 시
order.cancelled  → 주문 취소 시
order.completed  → 주문 완료 시
payment.pending  → 결제 대기
payment.completed → 결제 완료
payment.failed   → 결제 실패
payment.refunded → 환불 완료
```

---

## 7. 약국 B2C 관련 인프라 현황

### 7.1 이미 구축된 것 (재사용 가능)

| 구성요소 | 위치 | 상태 |
|----------|------|------|
| `organization_channels` 테이블 | Migration 20260215200001 | ✅ 배포됨 |
| `organization_product_channels` 테이블 | Migration 20260215200002 | ✅ 배포됨 |
| B2C 기본 채널 시드 | Migration 20260215200003 | ✅ 배포됨 |
| `OrganizationChannel` 엔티티 | `routes/kpa/entities/` | ✅ 등록됨 |
| `OrganizationProductChannel` 엔티티 | `routes/kpa/entities/` | ✅ 등록됨 |
| 채널 KPI 대시보드 | `ChannelLayerSection.tsx` | ✅ 구현됨 |
| 상품-채널 관리 UI/API | `pharmacy-products.controller.ts` | ✅ 구현됨 |
| `sales_limit` 컬럼 | Migration 20260215200004 | ✅ 배포됨 |

### 7.2 GlycoPharm 체크아웃 (이미 존재)

| 구성요소 | 파일 | 상태 |
|----------|------|------|
| 체크아웃 컨트롤러 | `routes/glycopharm/controllers/checkout.controller.ts` | ✅ Active |
| 라우트 등록 | `routes/glycopharm/glycopharm.routes.ts` (L93-100) | ✅ Active |
| Toss 결제 연동 | `services/toss-payments.service.ts` | ✅ Active |

### 7.3 약국 컨텍스트 미들웨어 패턴

**파일**: `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts`

```typescript
// 현재 패턴: user → glycopharm_pharmacies → pharmacyId
export function createPharmacyContextMiddleware(dataSource: DataSource) {
  return async (req, res, next) => {
    // Admin bypass
    if (hasAdminRole(user.roles)) { req.pharmacyId = null; next(); return; }
    // Pharmacy lookup
    const pharmacy = await dataSource.query(
      `SELECT id FROM glycopharm_pharmacies WHERE created_by_user_id = $1 AND status = 'active'`,
      [user.id]
    );
    req.pharmacyId = pharmacy?.[0]?.id;
    next();
  };
}
```

---

## 8. 가드레일 분석

### 8.1 CLAUDE.md 규칙 (§7, §13)

| 규칙 | 내용 | 약국 B2C 영향 |
|------|------|---------------|
| 주문 생성 필수 | `checkoutService.createOrder()` 통해서만 | ✅ 준수 필요 |
| OrderType 불변 | 생성 시 결정, 변경 금지 | ✅ GLYCOPHARM 고정 |
| 금지 테이블 | `*_orders`, `*_payments` 생성 금지 | ✅ 절대 생성 안 함 |
| 독립 주문 테이블 | ❌ 금지 | ✅ `ecommerce_orders` 사용 |

### 8.2 실제 가드 구현 여부

| 가드 | 상태 | 비고 |
|------|------|------|
| OrderCreationGuard (런타임) | ❌ 물리적 클래스 없음 | 문서에만 언급, 코드 미구현 |
| OrderType 강제 (계약) | ✅ 서비스별 DTO에서 강제 | CosmeticsOrderService: RETAIL 고정 |
| 금지 테이블 검사 (스키마) | ❌ 자동 검사 없음 | 코드 리뷰로만 방어 |

### 8.3 GlycoPharm Legacy 교훈

**파일**: `docs/platform-core/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md`

- **실패 원인**: 독립 주문 구조 (`glycopharm_orders`)가 통합 리포팅/정산을 불가능하게 만듦
- **교정**: E-commerce Core로 마이그레이션, 기존 테이블은 READ-ONLY
- **교훈**: 신규 서비스는 반드시 E-commerce Core 위임 패턴 사용

---

## 9. 5개 핵심 질문 답변

### Q1. organization_id가 Order 엔티티에 필요한가?

**답변**: **아니오 — `sellerId` 필드가 이미 그 역할을 한다.**

```
EcommerceOrder.sellerId = pharmacy organization UUID
EcommerceOrder.sellerType = 'organization'
EcommerceOrder.metadata.pharmacyId = 같은 UUID (편의용 중복)
```

별도 `organization_id` 컬럼 추가는 불필요. `sellerId`로 인덱싱하면 약국별 주문 조회 가능.

### Q2. channel_type을 Order에 추가해야 하나?

**답변**: **기존 `channel` 및 `orderSource` 필드로 충분.**

```
EcommerceOrder.channel = 'B2C'     (채널 유형)
EcommerceOrder.orderSource = 'online' | 'kiosk' | 'in-store'  (주문 출처)
```

`organization_channels.channel_type`은 **채널 승인/관리**용이고,
`EcommerceOrder.channel`은 **주문 분류**용으로 목적이 다르다.
두 필드를 연결할 필요가 있다면 `metadata`에 `channelId`를 저장하면 된다.

### Q3. 결제 흐름에 약국 B2C 전용 후크(Hook)가 필요한가?

**답변**: **Phase 1에서는 불필요. 기존 이벤트로 충분.**

현재 이벤트 (`order.created`, `payment.completed` 등)로 알림/재고 갱신 처리 가능.
약국 B2C 전용 후크가 필요해지는 시점:
- 처방전 검증 자동화 필요 시
- 약국별 정산 분리 필요 시
- 재고 자동 차감 필요 시

### Q4. 어떤 서비스 패턴을 따라야 하나?

**답변**: **CosmeticsOrderService 패턴을 따른다.**

| 항목 | Cosmetics (참조) | Pharmacy B2C (권장) |
|------|-------------------|---------------------|
| OrderType | `RETAIL` | `GLYCOPHARM` (이미 존재) |
| 채널 구분 | `metadata.channel` | `channel` 필드 + `metadata` |
| 서비스 클래스 | `CosmeticsOrderService` | `PharmacyCheckoutService` (신규) |
| DTO 변환 | `mapToCreateOrderDto()` | 동일 패턴 |
| 결제 | Toss Payments | Toss Payments (재사용) |

### Q5. 기존 GlycoPharm 체크아웃을 재사용할 수 있나?

**답변**: **부분 재사용 가능. 단, 리팩토링 필요.**

| 재사용 가능 | 변경 필요 |
|-------------|-----------|
| 라우트 구조 (`/checkout`, `/checkout/orders`) | 직접 repository → `EcommerceOrderService.create()` 위임 |
| 약국 검증 로직 (active 상태 확인) | **채널 승인 검증** 추가 (`organization_channels.status = APPROVED`) |
| Toss 결제 연동 | 그대로 |
| 주문 조회 (buyerId + orderType 필터) | 그대로 |
| metadata 구조 | **channel 정보** 추가 |

---

## 10. 절대 건드리면 안 되는 것

| 대상 | 이유 |
|------|------|
| `EcommerceOrder` 엔티티 구조 | Core 동결 — 컬럼 추가/변경 금지 |
| `EcommerceOrderItem` 엔티티 구조 | Core 동결 |
| `EcommercePayment` 엔티티 구조 | Core 동결 |
| `OrderType` enum 값 | 기존 값 변경 금지 (추가는 신중히) |
| `EcommerceOrderService.create()` 로직 | Core 메서드 변경 금지 |
| `checkout_orders` 테이블 | Legacy — 건드리지 않음 |
| 다른 서비스의 주문 흐름 | Cosmetics, Dropshipping 등 독립 |
| `*_orders`, `*_payments` 테이블 생성 | CLAUDE.md §7 절대 금지 |

---

## 11. 재사용해야 하는 것

| 대상 | 파일 | 용도 |
|------|------|------|
| `EcommerceOrderService.create()` | `packages/ecommerce-core/.../EcommerceOrderService.ts` | 주문 생성 |
| `EcommercePaymentService` | `packages/ecommerce-core/.../EcommercePaymentService.ts` | 결제 처리 |
| `tossPaymentsService` | `apps/api-server/src/services/toss-payments.service.ts` | PG 통신 |
| `organization_channels` | 이미 구축 | B2C 채널 승인 확인 |
| `organization_product_channels` | 이미 구축 | 상품-채널 매핑 |
| GlycoPharm checkout 라우트 구조 | `routes/glycopharm/controllers/checkout.controller.ts` | 참조 |
| PharmacyContext 미들웨어 패턴 | `modules/care/care-pharmacy-context.middleware.ts` | 약국 식별 |

---

## 12. 권장 아키텍처 (B2C 연결 시)

```
┌─────────────────────────────────────────────────────────┐
│              Pharmacy B2C Checkout Flow                   │
│                   (권장 아키텍처)                          │
└─────────────────────────────────────────────────────────┘

Consumer App (kpa-society-web)
  │
  ├─→ POST /api/kpa/pharmacy/checkout
  │     { pharmacyId, channelType: 'B2C', items, shippingAddress }
  │
  └─→ PharmacyCheckoutController
       │
       ├── 1. 약국 검증
       │   └── GlycopharmPharmacy WHERE id = pharmacyId AND status = 'active'
       │
       ├── 2. 채널 승인 검증 ← ★ 신규
       │   └── organization_channels WHERE org_id = pharmacyId
       │       AND channel_type = 'B2C' AND status = 'APPROVED'
       │
       ├── 3. 상품 채널 검증 ← ★ 신규
       │   └── organization_product_channels WHERE channel_id = B2C채널
       │       AND product_listing_id IN (...) AND is_active = true
       │
       ├── 4. sales_limit 검증 ← ★ 신규
       │   └── 일일/주간 판매량 < sales_limit 확인
       │
       ├── 5. EcommerceOrderService.create() ← Core 위임
       │   {
       │     buyerId: consumer.id,
       │     sellerId: pharmacyId,
       │     sellerType: ORGANIZATION,
       │     orderType: GLYCOPHARM,
       │     channel: 'B2C',
       │     orderSource: 'online',
       │     metadata: {
       │       serviceKey: 'glycopharm',
       │       pharmacyId, pharmacyName,
       │       channelId: B2C채널UUID,
       │       channelType: 'B2C'
       │     }
       │   }
       │
       └── 6. Toss 결제 → 기존 파이프라인 재사용
```

---

## 13. 문서-코드 불일치 사항

| 불일치 | 문서 | 코드 |
|--------|------|------|
| OrderType.GLYCOPHARM | CLAUDE.md §7: "BLOCKED" | `checkout.controller.ts`: **활발히 사용** |
| OrderType.COSMETICS | CLAUDE.md §7: 존재 | enum에 **없음** (RETAIL 사용) |
| OrderType.TOURISM | CLAUDE.md §7, O4O-STORE-RULES: 존재 | enum에 **없음** |
| OrderCreationGuard | O4O-STORE-RULES: 런타임 가드 | **물리적 구현 없음** |
| checkoutService.createOrder() | CLAUDE.md §7: 필수 | GlycoPharm: 직접 repository 사용 |

---

## 14. 결론 및 권장사항

### 즉시 가능

1. **기존 GlycoPharm 체크아웃 패턴을 기반으로** KPA 라우트에 B2C 체크아웃 엔드포인트 추가
2. **`organization_channels` 채널 승인 검증**을 체크아웃 흐름에 삽입
3. **`organization_product_channels`의 `is_active` + `sales_limit`**으로 상품 필터링

### 중기 개선 (별도 WO)

4. GlycoPharm 체크아웃을 `EcommerceOrderService.create()` 위임으로 리팩토링
5. CLAUDE.md §7의 `GLYCOPHARM: BLOCKED` 문서 현실화 (ACTIVE로 수정)
6. `OrderCreationGuard` 물리적 구현 (런타임 가드)

### 절대 금지

7. 새 주문/결제 테이블 생성
8. ecommerce-core 엔티티 구조 변경
9. OrderType enum 기존 값 변경

---

*Investigation completed: 2026-02-15*
*Author: AI Assistant*
*Status: COMPLETE — 코드 수정 없음*
