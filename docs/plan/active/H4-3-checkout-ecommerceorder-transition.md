# H4-3 + H4-4+6 완료 보고서

## 개요

| 항목 | 내용 |
|------|------|
| Work Order | H4-3: main-site Checkout → EcommerceOrder 전환 |
|            | H4-4+6: Checkout 도메인 완전 제거 |
| 상태 | **완료** |
| 완료일 | 2026-01-02 |

## 목표

- main-site의 Checkout 흐름을 EcommerceOrder API 기반으로 전환
- Checkout 도메인(Entity, Service, Controller, Routes) 완전 제거
- EcommerceOrder/EcommercePayment를 유일한 주문/결제 원장으로 확립

---

## H4-3: main-site Checkout → EcommerceOrder 전환

### 변경 파일

#### 1. apps/api-server/src/routes/ecommerce-orders.routes.ts (신규)
- EcommerceOrder 기반 주문 API
- Endpoints:
  - `POST /api/v1/orders/initiate` - 주문 생성 + 결제 준비
  - `POST /api/v1/orders/confirm` - 결제 승인
  - `POST /api/v1/orders/refund` - 환불
  - `GET /api/v1/orders/:id` - 주문 상세
  - `GET /api/v1/orders` - 내 주문 목록
- Phase N-1 검증 (MAX_ITEMS=3, MAX_AMOUNT=1,000,000)
- Toss Payments 연동

#### 2. apps/api-server/src/main.ts
- ecommerceOrdersRoutes import 추가
- `/api/v1/orders` 등록
- checkoutRoutes import/등록 주석 처리

#### 3. apps/main-site/src/hooks/queries/commerce/useCheckout.ts
- 기존 useCheckout() 호환성 유지 (mock data)
- 신규 hooks 추가:
  - `useInitiateOrder()` - 주문 생성 mutation
  - `useConfirmPayment()` - 결제 승인 mutation
  - `useMyOrders()` - 내 주문 목록 query
  - `useOrder(orderId)` - 주문 상세 query
- Types: InitiateOrderRequest, InitiateOrderResponse, ConfirmPaymentRequest, ConfirmPaymentResponse

#### 4. apps/main-site/src/views/checkout.json
- fetch.url: `/api/checkout` → `/api/v1/orders`
- `_h4_3_migration` 마커 추가

---

## H4-4+6: Checkout 도메인 완전 제거

### 삭제된 파일

| 파일 | 설명 |
|------|------|
| `apps/api-server/src/routes/checkout.routes.ts` | Checkout API 라우트 |
| `apps/api-server/src/services/checkout.service.ts` | Checkout 서비스 |
| `apps/api-server/src/controllers/checkout/checkoutController.ts` | Checkout 컨트롤러 (폴더 포함) |
| `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` | CheckoutOrder 엔티티 |
| `apps/api-server/src/entities/checkout/CheckoutPayment.entity.ts` | CheckoutPayment 엔티티 |

### 유지된 파일

| 파일 | 이유 |
|------|------|
| `apps/api-server/src/entities/checkout/OrderLog.entity.ts` | 감사 로그 용도, ecommerceOrderId 연결 |
| `apps/api-server/src/entities/checkout/index.ts` | OrderLog만 export |

### 수정된 파일

#### 1. apps/api-server/src/entities/checkout/index.ts
```typescript
// Before
export * from './CheckoutOrder.entity.js';
export * from './CheckoutPayment.entity.js';
export * from './OrderLog.entity.js';

// After
export * from './OrderLog.entity.js';
```

#### 2. apps/api-server/src/controllers/admin/adminOrderController.ts
- checkoutService 참조 제거
- Stub 구현으로 대체 (H4-5에서 EcommerceOrder 기반 구현 예정)
- 모든 API가 정상 응답 (빈 데이터 또는 501)

---

## 아키텍처 변화

### Before (H4-3 이전)
```
┌─────────────────┐     ┌─────────────────┐
│ CheckoutOrder   │     │ EcommerceOrder  │
│ CheckoutPayment │     │ EcommercePayment│
└────────┬────────┘     └────────┬────────┘
         │                       │
    checkout.routes         (미사용)
    checkout.service
```

### After (H4-4+6 이후)
```
┌─────────────────────────────┐
│ EcommerceOrder              │ ← 유일한 주문 원장
│ EcommercePayment            │ ← 유일한 결제 원장
│ OrderLog (ecommerceOrderId) │ ← 감사 로그
└────────────┬────────────────┘
             │
    ecommerce-orders.routes (신규)
    EcommerceOrderService
    EcommercePaymentService
    TossPaymentsService (ecommerce-core)
```

---

## API 변경 요약

### 제거된 API
- `POST /api/checkout` - 주문 생성
- `GET /api/checkout/:id` - 주문 조회
- `POST /api/checkout/confirm` - 결제 확인
- `GET /api/orders` (checkout 기반)

### 신규 API
- `POST /api/v1/orders/initiate` - 주문 생성 + 결제 준비
- `POST /api/v1/orders/confirm` - 결제 승인
- `POST /api/v1/orders/refund` - 환불
- `GET /api/v1/orders/:id` - 주문 상세
- `GET /api/v1/orders` - 내 주문 목록

---

## 빌드 검증

| 패키지 | 결과 |
|--------|------|
| api-server | **성공** |
| ecommerce-core | 성공 (H4-2) |

---

## 후속 작업 (H4-5)

1. **Admin Order API 구현**
   - `adminOrderController.ts`의 stub을 EcommerceOrder 기반으로 전환
   - EcommerceOrderService를 직접 사용하도록 변경

2. **DB Migration**
   - in-memory store → TypeORM EcommerceOrder 테이블
   - 기존 checkout_orders 데이터 마이그레이션 (필요시)

3. **OrderLog 연결**
   - ecommerceOrderId 기반 로그 기록

---

## 참고

- [H4-1 결정 문서](./H4-1-checkout-ecommerceorder-decision.md)
- [H4-2 Toss Migration](./H4-2-payment-toss-migration.md)
- [ecommerce-core TossPaymentsService](../../packages/ecommerce-core/src/services/pg/TossPaymentsService.ts)
