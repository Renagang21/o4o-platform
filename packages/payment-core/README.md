# @o4o/payment-core

> Payment Core v0.1 - O4O Platform Payment Infrastructure

## Overview

Payment Core는 O4O 플랫폼의 결제 인프라를 제공합니다.

### v0.1 Scope

- PG 통합 (Toss Payments)
- 결제 확인 (payment confirmation)
- `payment.completed` 이벤트 발행

### Out of Scope

- ❌ 정산/분배 (Settlement)
- ❌ 회계 연동 (Accounting)
- ❌ 환불 처리 (v0.2에서 추가)
- ❌ Event Store / CQRS

## Installation

```bash
pnpm add @o4o/payment-core
```

## API Endpoints

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | `/api/payments/prepare` | POST | 결제 요청 생성 |
| 2 | `/api/payments/pg/callback` | POST | PG 콜백 수신 |
| 3 | `/api/payments/:id/confirm` | POST | 서버 측 검증 ⭐ |
| 4 | `/api/payments/:id` | GET | 결제 상태 조회 |
| 5 | `/api/payment-events` | GET | 이벤트 로그 조회 |
| 6 | `/api/payments/health` | GET | 헬스 체크 |

## Events

### payment.completed

핵심 이벤트: 모든 Extension App은 이 이벤트를 구독하여 비즈니스 로직 수행

```typescript
interface PaymentCompletedEvent {
  eventType: 'payment.completed';
  paymentId: string;
  transactionId: string;
  orderId: string;
  paymentKey: string;
  paidAmount: number;
  paymentMethod: string;
  approvedAt: Date;
  card?: {
    company: string;
    number: string;
    installmentMonths: number;
  };
  receiptUrl?: string;
}
```

### Event Types

```typescript
enum PaymentEventType {
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_COMPLETED = 'payment.completed',  // ⭐
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
}
```

## Usage

### Prepare Payment

```typescript
const response = await paymentService.prepare({
  orderId: 'order-123',
  orderName: '상품명',
  amount: 10000,
  successUrl: 'https://example.com/success',
  failUrl: 'https://example.com/fail',
});
```

### Confirm Payment

```typescript
const result = await paymentService.confirm(paymentId, {
  paymentKey: 'toss-payment-key',
  orderId: 'order-123',
  amount: 10000,
});
```

### Subscribe to Events

```typescript
@OnEvent('payment.completed')
async handlePaymentCompleted(event: PaymentCompletedEvent) {
  // 비즈니스 로직 수행
  // - 재고 감소
  // - 배송 준비
  // - 알림 발송
}
```

## Work Order

- WO-O4O-PAYMENT-CORE-V0.1

## License

Private - O4O Platform
