# ecommerce-core

> **Status**: Active | **Version**: 1.0.0 | **Package**: @o4o/ecommerce-core

## 역할

판매 원장(Source of Truth). 주문·결제·판매 유형 통합 관리.

| 책임 | 경계 |
|------|------|
| EcommerceOrder, EcommerceOrderItem | 재고 → 서비스 앱 |
| EcommercePayment | 배송 → dropshipping-core |
| 판매 유형 분류 (retail, dropshipping, b2b, subscription) | 정산 → 비즈니스 앱 |

## 외부 노출

**Services**: EcommerceOrderService, EcommercePaymentService
**Types**: EcommerceOrder, EcommerceOrderItem, EcommercePayment, OrderType, OrderStatus, PaymentStatus
**Events**: `order.created/confirmed/cancelled/completed`, `payment.pending/completed/failed/refunded`

## API Routes

- `/api/v1/ecommerce/orders`, `/api/v1/ecommerce/orders/:id`
- `/api/v1/ecommerce/payments`, `/api/v1/ecommerce/payments/:id`

## 설정

- defaultCurrency: 'KRW', autoConfirmPayment: false
- orderNumberPrefix: 'ORD', paymentTimeout: 30분
- **allowPurge: false** (원장 데이터 삭제 금지)

## Dependencies

- organization-core
