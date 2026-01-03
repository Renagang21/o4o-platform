# H4-2: Toss 결제 로직의 EcommercePayment 이관

> **Status**: Completed
> **Date**: 2025-01-02
> **Work Order**: H4-2
> **Scope**: Toss 결제 의존성 ecommerce-core로 이관

---

## 1. 작업 요약

본 Work Order는 H4-1 결정(DEPRECATE CheckoutOrder)의 첫 단계로,
**Checkout 도메인의 Toss 결제 의존성을 `ecommerce-core`로 이관**했습니다.

### 완료된 작업

1. **EcommercePayment에 Toss 필드 추가**
2. **TossPaymentsService를 ecommerce-core로 이동**
3. **EcommercePaymentService에 Toss 전용 메서드 추가**
4. **빌드 검증 완료**

---

## 2. 이전 전/후 구조 비교

### 2.1 Before (Checkout 도메인)

```
apps/api-server/
├── entities/checkout/
│   └── CheckoutPayment.entity.ts    # paymentKey 필드
├── services/
│   ├── checkout.service.ts           # 결제 레코드 관리
│   └── toss-payments.service.ts      # Toss API 연동
└── controllers/checkout/
    └── checkoutController.ts         # 결제 흐름 처리
```

### 2.2 After (ecommerce-core)

```
packages/ecommerce-core/
├── entities/
│   └── EcommercePayment.entity.ts    # paymentKey, approvedAt 추가
└── services/
    ├── EcommercePaymentService.ts     # completeTossPayment, refundTossPayment 추가
    └── pg/
        ├── index.ts
        └── TossPaymentsService.ts     # Toss API 연동 (이관)
```

---

## 3. 변경된 파일

### 3.1 EcommercePayment.entity.ts

**추가된 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| `paymentKey` | varchar(255) | PG사 결제 키 (Toss paymentKey) |
| `approvedAt` | timestamp | PG사 결제 승인 시점 |

**metadata 구조:**

```typescript
{
  pg: {
    toss: { ... },        // Toss 응답 데이터
    tossRefund: { ... }   // 환불 응답 데이터
  }
}
```

### 3.2 EcommercePaymentService.ts

**추가된 메서드:**

| 메서드 | 용도 |
|--------|------|
| `completeTossPayment(paymentId, dto)` | Toss 결제 승인 후 완료 처리 |
| `refundTossPayment(paymentId, dto)` | Toss 환불 처리 |
| `findByPaymentKey(paymentKey)` | paymentKey로 결제 조회 |

**추가된 DTO:**

```typescript
interface CompleteTossPaymentDto {
  paymentKey: string;
  paidAmount: number;
  method: string;
  cardCompany?: string;
  cardNumber?: string;
  installmentMonths?: number;
  approvedAt: string;
  metadata?: Record<string, any>;
}

interface RefundTossPaymentDto {
  paymentKey: string;
  refundAmount: number;
  refundReason: string;
  canceledAt?: string;
  metadata?: Record<string, any>;
}
```

### 3.3 TossPaymentsService (신규)

**위치:** `packages/ecommerce-core/src/services/pg/TossPaymentsService.ts`

| 메서드 | 용도 |
|--------|------|
| `preparePayment(params)` | 결제 준비 정보 생성 |
| `confirmPayment(params)` | 결제 승인 요청 |
| `cancelPayment(params)` | 결제 취소 (환불) |
| `getPayment(paymentKey)` | 결제 조회 |
| `isConfigured()` | 설정 상태 확인 |
| `isTestMode()` | 테스트 모드 여부 |

---

## 4. Checkout에 남은 책임 목록

H4-2 이후에도 Checkout 도메인에 남아 있는 요소:

| 파일 | 역할 | 다음 단계 |
|------|------|-----------|
| `CheckoutOrder.entity.ts` | 주문 엔티티 | H4-3에서 EcommerceOrder로 전환 |
| `CheckoutPayment.entity.ts` | 결제 엔티티 | H4-6에서 삭제 |
| `checkout.routes.ts` | API 엔드포인트 | H4-4에서 비활성화 |
| `checkoutController.ts` | 주문/결제 흐름 | H4-3에서 전환 |
| `checkout.service.ts` | 주문 CRUD | H4-3에서 전환 |
| `toss-payments.service.ts` | **Deprecated** | api-server에서 ecommerce-core 사용으로 전환 예정 |
| `OrderLog.entity.ts` | 감사 로그 | 유지 (KEEP) |

---

## 5. 다음 단계(H4-3) 전환 준비 상태

### 5.1 ecommerce-core 준비 완료 항목

- [x] EcommercePayment에 Toss 필드 존재
- [x] TossPaymentsService 독립 동작 가능
- [x] EcommercePaymentService에서 Toss 결제 처리 가능
- [x] 이벤트 발행 (`payment.toss.completed`, `payment.toss.refunded`)

### 5.2 H4-3에서 필요한 작업

1. **main-site checkout shortcode 수정**
   - `/api/checkout/*` → ecommerce-core API 호출
   - `useCheckout.ts` 훅 수정

2. **checkoutController 로직 이관**
   - `initiate` → EcommerceOrderService.create + EcommercePaymentService.createPayment
   - `confirm` → EcommercePaymentService.completeTossPayment
   - `refund` → EcommercePaymentService.refundTossPayment

3. **api-server에서 ecommerce-core TossPaymentsService 사용**
   - `toss-payments.service.ts` → deprecated 표시
   - import를 `@o4o/ecommerce-core`로 변경

---

## 6. 빌드 검증 결과

| 패키지 | 빌드 결과 |
|--------|-----------|
| `@o4o/ecommerce-core` | ✅ 성공 |
| `@o4o/api-server` | ✅ 성공 |

---

## 7. 영향 분석

### 7.1 영향 없음

- CosmeticsOrderService (영향 없음)
- Travel 주문 기능 (영향 없음)
- 기존 EcommerceOrder 기능 (영향 없음)

### 7.2 호환성

- 기존 EcommercePaymentService 메서드 모두 유지
- 새 메서드는 Toss 전용으로 추가
- Checkout 도메인은 아직 동작 (H4-3까지 병렬 운영)

---

## 8. 코드 품질

### 8.1 추가된 이벤트

| 이벤트 | 발생 시점 |
|--------|-----------|
| `payment.toss.completed` | Toss 결제 승인 완료 |
| `payment.toss.refunded` | Toss 환불 완료 |

### 8.2 에러 처리

- `Payment not found`: 결제 레코드 미존재
- `Cannot refund uncompleted payment`: 미완료 결제 환불 시도
- `Payment key mismatch`: paymentKey 불일치

---

## 9. 결론

H4-2 Work Order는 성공적으로 완료되었습니다.

**다음 단계**: H4-3 (main-site checkout → EcommerceOrder API 전환)

---

*Document Version: 1.0*
*Created by: H4-2 Work Order Execution*
*Build Verification: Passed*
