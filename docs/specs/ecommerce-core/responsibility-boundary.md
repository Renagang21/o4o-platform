# E-commerce Core vs Dropshipping Core 책임 경계

> 이 문서는 E-commerce Core와 Dropshipping Core의 책임 경계를 명확히 정의한다.

---

## 책임 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                     E-commerce Core                             │
│                   (판매 사실 - Source of Truth)                  │
├─────────────────────────────────────────────────────────────────┤
│  - 주문 발생 기록 (EcommerceOrder)                              │
│  - 결제 상태 관리 (PaymentStatus)                               │
│  - 주문 유형 분류 (orderType)                                   │
│  - 구매자/판매자 정보                                           │
│  - 배송지 정보                                                  │
│  - order.created 이벤트 발행                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ ecommerceOrderId (FK)
                              │ (orderType === 'dropshipping')
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Dropshipping Core                            │
│                  (공급/정산 분기 - Relay)                        │
├─────────────────────────────────────────────────────────────────┤
│  - 주문 relay 추적 (OrderRelay)                                 │
│  - 공급자 전달 상태 (relayStatus)                               │
│  - 수수료 계산 (CommissionTransaction)                          │
│  - 정산 배치 (SettlementBatch)                                  │
│  - order.relay.dispatched 이벤트 발행                           │
│  - order.relay.fulfilled 이벤트 발행                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (productType === 'cosmetics')
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Dropshipping Extension                         │
│              (산업 특화 - Cosmetics, Pharmacy 등)                │
├─────────────────────────────────────────────────────────────────┤
│  - 공급자 선택 정책 (화장품 인증 공급자 등)                       │
│  - 정산 정책 (화장품 수수료율 등)                                │
│  - 검증 정책 (화장품 규제 검증 등)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 상세 책임 분류

### E-commerce Core 책임

| 구분 | 항목 | 설명 |
|------|------|------|
| 주문 식별 | orderId, orderNumber, externalOrderId | 주문 고유 식별자 |
| 당사자 | buyerId, sellerId | 구매자/판매자 정보 |
| 금액 | subtotal, shippingFee, discount, totalAmount | 결제 금액 |
| 결제 | paymentStatus, paymentMethod, paidAt | 결제 상태 |
| 배송지 | shippingAddress | 수령인, 주소, 연락처 |
| 유형 | orderType | retail / dropshipping / b2b / subscription |
| 상태 | status | created → confirmed → processing → shipped → delivered → completed |
| 이벤트 | order.created | 주문 생성 이벤트 |

### Dropshipping Core 책임

| 구분 | 항목 | 설명 |
|------|------|------|
| Relay 식별 | OrderRelay.id, ecommerceOrderId (FK) | Relay 고유 식별자 |
| Relay 추적 | relayStatus | pending → relayed → confirmed → shipped → delivered |
| 시점 기록 | relayedAt, confirmedAt, shippedAt, deliveredAt | 공급자 처리 타임스탬프 |
| 관계 | listingId, offerId | Seller Listing 참조 |
| 수수료 | CommissionTransaction | 수수료 계산 및 기록 |
| 정산 | SettlementBatch | 기간별 정산 배치 |
| 이벤트 | order.relay.dispatched, order.relay.fulfilled | Relay 상태 이벤트 |

### Dropshipping Extension 책임

| 구분 | 항목 | 설명 |
|------|------|------|
| 검증 | validateOfferCreation | 산업 특화 Offer 검증 |
| 검증 | validateListingCreation | 산업 특화 Listing 검증 |
| 검증 | validateOrderCreation | 산업 특화 Order 검증 |
| 정책 | beforeCommissionApply | 산업 특화 수수료 정책 |
| 정책 | beforeSettlementCreate | 산업 특화 정산 정책 |

---

## 이벤트 흐름

```
[주문 발생]
     │
     ▼
E-commerce Core
├── 1. EcommerceOrder 생성
├── 2. PaymentStatus: pending → paid
├── 3. Event: order.created
└── 4. orderType: 'dropshipping' → Dropshipping Core 트리거
     │
     ▼
Dropshipping Core
├── 5. OrderRelay 생성 (ecommerceOrderId FK)
├── 6. relayStatus: pending
├── 7. 공급자 전달 (relayToSupplier)
├── 8. relayStatus: relayed
├── 9. Event: order.relay.dispatched
├── 10. 공급자 출고
├── 11. relayStatus: shipped
├── 12. 배송 완료
├── 13. relayStatus: delivered
├── 14. Event: order.relay.fulfilled
├── 15. CommissionTransaction 생성
└── 16. SettlementBatch 갱신
```

---

## 코드 예시 (Phase 2 구현 예정)

### E-commerce Order 생성

```typescript
// Service App (cosmetics-store 등)
async function createOrder(orderData: CreateOrderDto) {
  // 1. E-commerce Core에 주문 생성 요청
  const ecommerceOrder = await ecommerceOrderService.create({
    buyerId: orderData.buyerId,
    sellerId: orderData.sellerId,
    totalAmount: orderData.totalAmount,
    shippingAddress: orderData.shippingAddress,
    orderType: 'dropshipping', // 판매 유형 결정은 Service App에서
  });

  // 2. Dropshipping Core는 order.created 이벤트를 구독하여
  //    orderType === 'dropshipping'인 경우 OrderRelay 자동 생성
  return ecommerceOrder;
}
```

### OrderRelay 자동 생성 (이벤트 기반)

```typescript
// Dropshipping Core
@OnEvent('order.created')
async function handleOrderCreated(event: OrderCreatedEvent) {
  if (event.orderType !== 'dropshipping') {
    return; // Dropshipping이 아니면 무시
  }

  // OrderRelay 생성
  await orderRelayService.createFromEcommerceOrder({
    ecommerceOrderId: event.orderId,
    listingId: event.metadata?.listingId,
  });
}
```

---

*최종 업데이트: 2025-12-13*
