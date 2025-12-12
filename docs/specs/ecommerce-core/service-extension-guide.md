# Service Extension Guide for E-commerce Core

**Version**: 1.0
**Date**: 2025-12-13
**Status**: Phase 3 Stable

---

## 1. Overview

이 문서는 E-commerce Core를 기반으로 Service App/Extension을 개발할 때의 가이드라인을 정의합니다.

### 핵심 원칙

```
E-commerce Core (판매 원장)
    ↑
    │ OrderType 결정
    │
Service Extension (비즈니스 로직)
```

**Service Extension이 주문의 OrderType을 결정**하고,
E-commerce Core는 이를 기준으로 통합 관리합니다.

---

## 2. Service Extension의 역할

### 2.1 해야 할 일 (DO)

| 역할 | 설명 | 예시 |
|------|------|------|
| **OrderType 결정** | 비즈니스 로직에 따라 주문 유형 결정 | 화장품 드랍쉬핑 → `OrderType.DROPSHIPPING` |
| **판매 정책 판단** | 할인, 프로모션, 회원 혜택 적용 | VIP 할인 10%, 첫 구매 쿠폰 등 |
| **상품 특화 로직** | 도메인 특화 검증 및 처리 | 피부타입 매칭, 성분 검증 등 |
| **UI/UX 커스터마이징** | 서비스별 화면 구성 | 화장품 상세 페이지, 루틴 추천 등 |
| **이벤트 구독** | E-commerce Core 이벤트 수신 및 처리 | `order.created` → 알림 발송 |

### 2.2 하지 말아야 할 일 (DON'T)

| 금지 사항 | 이유 | 대안 |
|----------|------|------|
| **Order 생성 로직 재정의** | Source of Truth 일관성 | E-commerce Core의 `createOrder()` 사용 |
| **결제 상태 직접 변경** | 결제 무결성 | `EcommercePaymentService` 사용 |
| **OrderType 변경** | 주문 분류 일관성 | 생성 시점에만 결정, 이후 불변 |
| **정산 로직 직접 구현** | Core App 책임 분리 | Dropshipping Core 정산 서비스 사용 |
| **E-commerce Entity 직접 수정** | 데이터 무결성 | Service API 사용 |

---

## 3. OrderType 결정 가이드

### 3.1 결정 시점

```typescript
// Service Extension에서 주문 생성 시
const order = await ecommerceOrderService.create({
  buyerId: user.id,
  sellerId: seller.id,
  orderType: OrderType.DROPSHIPPING, // ← Service Extension이 결정
  items: [...],
});
```

### 3.2 OrderType 선택 기준

```
판매자가 직접 재고를 보유?
├─ Yes → OrderType.RETAIL
└─ No → 공급자를 통한 배송?
         ├─ Yes → OrderType.DROPSHIPPING
         └─ No → 정기 배송?
                  ├─ Yes → OrderType.SUBSCRIPTION
                  └─ No → B2B 대량 거래?
                           ├─ Yes → OrderType.B2B
                           └─ No → OrderType.RETAIL (기본값)
```

### 3.3 서비스별 일반적인 OrderType

| 서비스 | 기본 OrderType | 비고 |
|--------|---------------|------|
| 화장품 쇼핑몰 | DROPSHIPPING | 공급자 Relay 구조 |
| 약사회 물품 | B2B | 대량 구매 |
| 관광객 쇼핑 | RETAIL | 즉시 배송 |
| 정기 구독 서비스 | SUBSCRIPTION | 자동 갱신 |

---

## 4. E-commerce Core 활용 패턴

### 4.1 주문 생성 패턴

```typescript
// ✅ 올바른 패턴
class CosmeticsCheckoutService {
  async checkout(cart: Cart, user: User): Promise<EcommerceOrder> {
    // 1. Service Extension이 OrderType 결정
    const orderType = this.determineOrderType(cart);

    // 2. E-commerce Core에 주문 생성 위임
    const order = await this.ecommerceOrderService.create({
      buyerId: user.id,
      sellerId: cart.sellerId,
      orderType,
      items: cart.items.map(item => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    });

    // 3. Dropshipping Core에 Relay 생성 (orderType === DROPSHIPPING인 경우)
    if (orderType === OrderType.DROPSHIPPING) {
      await this.orderRelayService.createOrder({
        ecommerceOrderId: order.id,
        listingId: cart.listingId,
        quantity: cart.totalQuantity,
        // ...
      });
    }

    return order;
  }
}
```

### 4.2 이벤트 구독 패턴

```typescript
// Service Extension의 이벤트 핸들러
@EventSubscriber()
class CosmeticsOrderEventHandler {
  @OnEvent('order.created')
  async handleOrderCreated(order: EcommerceOrder) {
    // 자신의 서비스 관련 주문만 처리
    if (order.orderType !== OrderType.DROPSHIPPING) return;
    if (!this.isCosmeticsOrder(order)) return;

    // 서비스 특화 로직 실행
    await this.sendOrderNotification(order);
    await this.updateInventoryReservation(order);
  }
}
```

### 4.3 통계 조회 패턴

```typescript
// Service Extension에서 통계 조회
class CosmeticsAnalyticsService {
  async getDashboardStats(sellerId: string): Promise<DashboardStats> {
    // E-commerce Core의 공통 Query Service 활용
    const dailySummary = await this.queryService.getDailyOrderSummary(
      startDate,
      endDate,
      OrderType.DROPSHIPPING
    );

    const sellerStats = await this.queryService.getStatsBySeller(
      OrderType.DROPSHIPPING,
      startDate,
      endDate
    );

    return { dailySummary, sellerStats };
  }
}
```

---

## 5. 금지 패턴 (Anti-Patterns)

### 5.1 ❌ OrderType 변경 시도

```typescript
// 잘못된 패턴
order.orderType = OrderType.RETAIL; // ❌ 변경 금지!
await orderRepository.save(order);
```

### 5.2 ❌ 결제 상태 직접 변경

```typescript
// 잘못된 패턴
order.paymentStatus = PaymentStatus.PAID; // ❌
await orderRepository.save(order);

// ✅ 올바른 패턴
await ecommerceOrderService.updatePaymentStatus(
  order.id,
  PaymentStatus.PAID
);
```

### 5.3 ❌ Order 생성 로직 재구현

```typescript
// 잘못된 패턴
const order = new EcommerceOrder();
order.orderNumber = this.generateOrderNumber(); // ❌ 직접 생성 금지
await this.orderRepository.save(order);

// ✅ 올바른 패턴
const order = await this.ecommerceOrderService.create({...});
```

---

## 6. 체크리스트

Service Extension 개발 시 확인 사항:

### 6.1 주문 생성

- [ ] OrderType을 비즈니스 로직에 따라 결정했는가?
- [ ] `EcommerceOrderService.create()`를 사용했는가?
- [ ] OrderType === DROPSHIPPING이면 OrderRelay도 생성했는가?

### 6.2 결제 처리

- [ ] `EcommercePaymentService`를 통해 결제를 처리했는가?
- [ ] 결제 상태를 직접 변경하지 않았는가?

### 6.3 통계/조회

- [ ] `EcommerceOrderQueryService`를 활용했는가?
- [ ] 정산 관련 계산은 Core App에 위임했는가?

### 6.4 이벤트 처리

- [ ] 자신의 서비스 관련 주문만 처리하는가?
- [ ] 다른 서비스에 영향을 주지 않는가?

---

## 7. 참조

- [E-commerce Core Phase 1 설계](./00-phase1-order-responsibility-design.md)
- [OrderType 정의](../../packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts)
- [EcommerceOrderQueryService](../../packages/ecommerce-core/src/services/EcommerceOrderQueryService.ts)
- [Dropshipping Core 연계](../../packages/dropshipping-core/src/services/OrderRelayService.ts)
