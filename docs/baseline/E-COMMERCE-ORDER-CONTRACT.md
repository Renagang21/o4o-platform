# E-commerce Core Order Contract

**Version**: 1.0
**Status**: Active
**Effective Date**: 2026-01-11
**Reference**: WO-O4O-STRUCTURE-REFORM-PHASE5-A′-V01

---

## 1. 목적

본 문서는 O4O Platform에서 **주문(Order)**이 생성되고 관리되는 유일한 방식을 정의합니다.

> **핵심 원칙**: 모든 주문은 E-commerce Core를 통해서만 생성됩니다.

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| **E-commerce Core** | 주문/결제를 담당하는 플랫폼 핵심 모듈 |
| **CheckoutOrder** | 주문 엔티티 (`checkout_orders` 테이블) |
| **OrderType** | 주문을 생성한 서비스를 식별하는 열거형 |
| **Service Module** | GlycoPharm, Cosmetics, Tourism 등 비즈니스 서비스 |

---

## 3. OrderType 정의

```typescript
enum OrderType {
  GENERIC = 'GENERIC',         // 일반 주문 (기본값)
  DROPSHIPPING = 'DROPSHIPPING', // 드롭쉬핑 주문
  GLYCOPHARM = 'GLYCOPHARM',   // GlycoPharm 약국 주문
  COSMETICS = 'COSMETICS',     // Cosmetics 화장품 주문
  TOURISM = 'TOURISM',         // Tourism 관광 주문
}
```

### 3.1 OrderType 규칙

| 규칙 | 설명 |
|------|------|
| **필수값** | 모든 주문은 반드시 orderType을 가져야 함 |
| **불변성** | orderType은 생성 후 변경 불가 |
| **기본값** | 미지정 시 `GENERIC`으로 설정 |

---

## 4. 주문 생성 규칙

### 4.1 허용된 주문 생성 경로

```
┌─────────────────────────────────────────────────────────────┐
│                    E-commerce Core                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  POST /api/checkout/initiate                         │   │
│  │  + orderType: OrderType                              │   │
│  │  + items: OrderItem[]                                │   │
│  │  + shippingAddress: ShippingAddress                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CheckoutService.createOrder()                       │   │
│  │  → checkout_orders 테이블 INSERT                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 금지된 주문 생성 경로

| 금지 경로 | 상태 |
|-----------|------|
| GlycoPharm 직접 주문 생성 | ❌ 410 Gone (Phase 5-A) |
| 서비스 모듈에서 checkout_orders INSERT | ❌ 절대 금지 |
| OrderType 없는 주문 생성 | ❌ 기본값 GENERIC 적용 |

---

## 5. 서비스별 주문 정책

### 5.1 GlycoPharm (OrderType: GLYCOPHARM)

| 항목 | 정책 |
|------|------|
| 주문 생성 | E-commerce Core 통해서만 |
| 기존 API | 410 Gone 반환 |
| 주문 조회 | 기존 API 유지 (read-only) |
| 데이터 마이그레이션 | 별도 Phase 필요 |

**참조 파일**:
- `apps/api-server/src/routes/glycopharm/controllers/order.controller.ts`
- `apps/api-server/src/routes/glycopharm/services/order.service.ts`

### 5.2 Cosmetics (OrderType: COSMETICS)

| 항목 | 정책 |
|------|------|
| 주문 생성 | **별도 독립 Commerce** (CLAUDE.md §11-14) |
| 독립 스키마 | `cosmetics_*` prefix 테이블 |
| E-commerce Core 통합 | 미적용 (의도적 분리) |

**참조 문서**: CLAUDE.md §11-14 (Cosmetics Domain Rules)

### 5.3 Dropshipping (OrderType: DROPSHIPPING)

| 항목 | 정책 |
|------|------|
| 주문 생성 | E-commerce Core 통해서만 |
| 이행(Fulfillment) | Dropshipping-Core 처리 |

### 5.4 Tourism (OrderType: TOURISM)

| 항목 | 정책 |
|------|------|
| 주문 생성 | E-commerce Core 통해서만 (향후 구현) |
| 현재 상태 | 미구현 |

---

## 6. API 명세

### 6.1 주문 생성 API

```http
POST /api/checkout/initiate

Request Body:
{
  "orderType": "GLYCOPHARM",      // Optional, default: GENERIC
  "items": [
    {
      "productId": "uuid",
      "productName": "상품명",
      "quantity": 1,
      "unitPrice": 10000
    }
  ],
  "shippingAddress": {
    "recipientName": "홍길동",
    "phone": "010-1234-5678",
    "zipCode": "12345",
    "address1": "서울시 강남구",
    "address2": "123호"
  },
  "partnerId": "optional-partner-id",
  "successUrl": "/checkout/result",
  "failUrl": "/checkout/result"
}

Response (201):
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-20260111-1234",
    "orderType": "GLYCOPHARM",
    "totalAmount": 10000,
    "payment": {
      "clientKey": "...",
      "orderId": "ORD-20260111-1234",
      "orderName": "상품명",
      "amount": 10000,
      "successUrl": "...",
      "failUrl": "...",
      "isTestMode": true
    }
  }
}
```

### 6.2 OrderType 유효성 검사

```typescript
// 유효한 OrderType 검증
if (orderType && !Object.values(OrderType).includes(orderType)) {
  return res.status(400).json({
    success: false,
    message: `Invalid orderType. Must be one of: ${Object.values(OrderType).join(', ')}`
  });
}
```

---

## 7. 데이터베이스 스키마

### 7.1 checkout_orders 테이블

```sql
CREATE TABLE checkout_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  order_type checkout_orders_order_type_enum NOT NULL DEFAULT 'GENERIC',
  buyer_id UUID NOT NULL,
  seller_id VARCHAR(100) NOT NULL,
  supplier_id VARCHAR(100) NOT NULL,
  partner_id VARCHAR(100),
  subtotal DECIMAL(12,2) DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status checkout_order_status_enum DEFAULT 'created',
  payment_status checkout_payment_status_enum DEFAULT 'pending',
  payment_method VARCHAR(50),
  shipping_address JSONB,
  items JSONB NOT NULL,
  metadata JSONB,
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checkout_orders_order_type ON checkout_orders(order_type);
CREATE INDEX idx_checkout_orders_buyer_id ON checkout_orders(buyer_id);
CREATE INDEX idx_checkout_orders_supplier_id ON checkout_orders(supplier_id);
```

### 7.2 OrderType Enum

```sql
CREATE TYPE checkout_orders_order_type_enum AS ENUM (
  'GENERIC',
  'DROPSHIPPING',
  'GLYCOPHARM',
  'COSMETICS',
  'TOURISM'
);
```

---

## 8. 코드 참조

| 컴포넌트 | 파일 경로 |
|----------|-----------|
| CheckoutOrder Entity | `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` |
| CheckoutService | `apps/api-server/src/services/checkout.service.ts` |
| CheckoutController | `apps/api-server/src/controllers/checkout/checkoutController.ts` |
| Migration | `apps/api-server/src/database/migrations/1736950000000-AddOrderTypeToCheckoutOrders.ts` |

---

## 9. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 서비스에서 직접 주문 생성 | 즉시 비활성화 (410 Gone) |
| checkout_orders 직접 INSERT | 코드 리뷰에서 차단 |
| OrderType 없이 주문 생성 | 기본값 GENERIC 적용 (경고 로깅) |

---

## 10. 관련 문서

- CLAUDE.md §7: E-commerce Core 절대 규칙
- CLAUDE.md §11-14: Cosmetics Domain Rules
- WO-O4O-STRUCTURE-REFORM-PHASE5-V01: GlycoPharm 구조 개혁
- WO-O4O-STRUCTURE-REFORM-PHASE5-A′-V01: E-commerce Core 주문 표준화

---

**Document Version**: 1.0
**Last Updated**: 2026-01-11
