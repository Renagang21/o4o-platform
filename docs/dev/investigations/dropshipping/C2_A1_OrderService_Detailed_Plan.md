# C-2-A-1: OrderService 구조 리팩토링 상세 실행 계획

**작성일**: 2025-11-19
**대상 파일**: `apps/api-server/src/services/OrderService.ts`
**현재 상태**: 1183 lines, VERY HIGH complexity
**목표 상태**: 500 lines 이하, 역할별 서비스 분리

---

## 📋 목차

1. [현재 상태 분석](#1-현재-상태-분석)
2. [메서드 분류 및 이동 계획](#2-메서드-분류-및-이동-계획)
3. [Phase별 상세 작업 계획](#3-phase별-상세-작업-계획)
4. [새로운 서비스 파일 구조](#4-새로운-서비스-파일-구조)
5. [테스트 시나리오](#5-테스트-시나리오)
6. [체크리스트](#6-체크리스트)

---

## 1. 현재 상태 분석

### 1.1 OrderService 메서드 목록 (총 30개)

#### Public 메서드 (17개)

| 메서드명 | Lines | 책임 | 복잡도 |
|---------|-------|------|--------|
| `createOrder` | 79-187 | 주문 생성 + 커미션 계산 + 이벤트 + 알림 | HIGH |
| `createOrderFromCart` | 192-266 | 장바구니 주문 생성 + 커미션 + 이벤트 + 알림 | HIGH |
| `getOrders` | 268-339 | 주문 목록 조회 + 필터링 | MEDIUM |
| `getOrderById` | 341-360 | 주문 상세 조회 | LOW |
| `updateOrderStatus` | 362-472 | 상태 변경 + 이벤트 + 알림 | HIGH |
| `updatePaymentStatus` | 474-503 | 결제 상태 변경 + 이벤트 | MEDIUM |
| `cancelOrder` | 505-531 | 주문 취소 + 이벤트 + 알림 | MEDIUM |
| `requestRefund` | 533-561 | 환불 요청 + 이벤트 | MEDIUM |
| `getOrderStats` | 563-597 | 주문 통계 조회 | MEDIUM |
| `createPartnerCommissions` | 628-701 | 파트너 커미션 생성 | HIGH |
| `confirmPartnerCommissions` | 718-738 | 파트너 커미션 확정 | MEDIUM |
| `cancelPartnerCommissions` | 740-762 | 파트너 커미션 취소 | MEDIUM |
| `getOrderCommissions` | 764-778 | 주문 커미션 조회 | LOW |
| `trackReferralClick` | 780-806 | 추천 클릭 추적 | MEDIUM |
| `getOrdersForSeller` | 808-879 | 판매자 주문 조회 | MEDIUM |
| `getOrdersForSupplier` | 881-951 | 공급자 주문 조회 | MEDIUM |
| `updateOrderShipping` | 953-1011 | 배송 정보 업데이트 + 이벤트 | MEDIUM |
| `getOrderWithEvents` | 1013-1036 | 주문 + 이벤트 조회 | LOW |

#### Private 메서드 (7개)

| 메서드명 | Lines | 책임 |
|---------|-------|------|
| `generateOrderNumber` | 599-605 | 주문 번호 생성 |
| `calculateOrderSummary` | 607-626 | 주문 요약 계산 |
| `updatePartnerPerformance` | 703-716 | 파트너 성과 업데이트 |
| `createOrderEvent` | 1038-1070 | 이벤트 생성 및 저장 |
| `validateStatusTransition` | 1072-1088 | 상태 전환 검증 |
| `getStatusDisplayName` | 1090-1105 | 상태 표시명 변환 |
| `sendOrderNotifications` | 1107-1183 | 알림 발송 (판매자/공급자) |

### 1.2 복잡도 분포

| 복잡도 | 메서드 수 | 비율 |
|--------|-----------|------|
| HIGH | 4개 | 24% |
| MEDIUM | 12개 | 71% |
| LOW | 4개 | 24% |

### 1.3 주요 문제점

1. **God Service 패턴**
   - 주문 생성, 커미션 계산, 이벤트 생성, 알림 발송을 모두 처리
   - SRP 위반

2. **트랜잭션 관리 복잡성**
   - `createOrder`, `createOrderFromCart`, `updateOrderStatus` 등에서 복잡한 트랜잭션 처리

3. **커미션 로직 혼재**
   - 주문 생성 시 커미션 계산
   - 파트너 커미션 별도 관리
   - CommissionCalculator와 중복/혼재

4. **이벤트 & 알림 혼재**
   - 거의 모든 메서드에서 이벤트 생성 및 알림 발송 처리

5. **중복 조회 로직**
   - `getOrders`, `getOrdersForSeller`, `getOrdersForSupplier`가 유사한 구조

---

## 2. 메서드 분류 및 이동 계획

### 2.1 새로운 서비스 구조

```
apps/api-server/src/services/order/
  OrderCreationService.ts          (~200 lines)
  OrderSplittingService.ts         (~150 lines)
  OrderCommissionService.ts        (~150 lines)
  OrderStatusService.ts            (~200 lines)
  OrderEventService.ts             (~100 lines)
  OrderNotificationService.ts      (~80 lines)
  OrderQueryService.ts             (~150 lines)

apps/api-server/src/services/
  OrderService.ts (refactored)     (~300 lines)
```

### 2.2 메서드 이동 매핑

#### OrderCreationService (주문 생성)

| 메서드 | 이동 후 이름 | 책임 |
|--------|-------------|------|
| `createOrder` | `createOrderFromItems` | 항목 기반 주문 생성 (커미션 제외) |
| `createOrderFromCart` | `createOrderFromCart` | 장바구니 기반 주문 생성 (커미션 제외) |
| `generateOrderNumber` | `generateOrderNumber` | 주문 번호 생성 |
| `calculateOrderSummary` | `calculateOrderSummary` | 주문 요약 계산 |

**책임**:
- 주문 엔티티 생성 및 저장
- 주문 항목 검증
- 주문 번호 생성
- 주문 요약 계산
- **커미션 계산은 하지 않음** (OrderCommissionService에 위임)

---

#### OrderSplittingService (주문 분할 - 드랍쉬핑)

| 메서드 | 이동 후 이름 | 책임 |
|--------|-------------|------|
| (새로 작성) | `splitOrderBySupplier` | 공급자별 주문 분할 |
| (새로 작성) | `groupItemsBySupplier` | 항목을 공급자별로 그룹화 |
| (새로 작성) | `createSubOrder` | 하위 주문 생성 |

**책임**:
- 드랍쉬핑 주문을 공급자별로 분할
- 각 공급자에 대한 하위 주문 생성

**참고**: 현재 OrderService에는 명시적인 주문 분할 로직이 없음. 이후 DS 단계에서 추가될 가능성 있음.

---

#### OrderCommissionService (커미션 계산)

| 메서드 | 이동 후 이름 | 책임 |
|--------|-------------|------|
| `createOrder` 내부 로직 | `calculateItemCommissions` | 주문 항목별 커미션 계산 |
| `createPartnerCommissions` | `createPartnerCommissions` | 파트너 커미션 생성 |
| `confirmPartnerCommissions` | `confirmPartnerCommissions` | 파트너 커미션 확정 |
| `cancelPartnerCommissions` | `cancelPartnerCommissions` | 파트너 커미션 취소 |
| `getOrderCommissions` | `getOrderCommissions` | 주문 커미션 조회 |
| `trackReferralClick` | `trackReferralClick` | 추천 클릭 추적 |
| `updatePartnerPerformance` | `updatePartnerPerformance` | 파트너 성과 업데이트 |

**책임**:
- 주문 생성 시 항목별 커미션 계산
- 파트너 커미션 생성/확정/취소
- 추천 코드 추적
- CommissionCalculator와 협업

---

#### OrderStatusService (상태 관리)

| 메서드 | 이동 후 이름 | 책임 |
|--------|-------------|------|
| `updateOrderStatus` | `updateOrderStatus` | 주문 상태 변경 |
| `updatePaymentStatus` | `updatePaymentStatus` | 결제 상태 변경 |
| `cancelOrder` | `cancelOrder` | 주문 취소 |
| `requestRefund` | `requestRefund` | 환불 요청 |
| `updateOrderShipping` | `updateOrderShipping` | 배송 정보 업데이트 |
| `validateStatusTransition` | `validateStatusTransition` | 상태 전환 검증 |
| `getStatusDisplayName` | `getStatusDisplayName` | 상태 표시명 |

**책임**:
- 주문 상태 변경 및 검증
- 결제 상태 관리
- 배송 정보 관리
- 상태 전환 규칙 검증

---

#### OrderEventService (이벤트 관리)

| 메서드 | 이동 후 이름 | 책임 |
|--------|-------------|------|
| `createOrderEvent` | `createEvent` | 이벤트 생성 및 저장 |
| (새로 작성) | `createOrderCreatedEvent` | ORDER_CREATED 이벤트 |
| (새로 작성) | `createStatusChangedEvent` | STATUS_CHANGED 이벤트 |
| (새로 작성) | `createPaymentStatusChangedEvent` | PAYMENT_STATUS_CHANGED 이벤트 |
| (새로 작성) | `createOrderCancelledEvent` | ORDER_CANCELLED 이벤트 |
| (새로 작성) | `createRefundRequestedEvent` | REFUND_REQUESTED 이벤트 |
| (새로 작성) | `createShippingUpdatedEvent` | SHIPPING_UPDATED 이벤트 |
| `getOrderWithEvents` | `getOrderWithEvents` | 주문 + 이벤트 조회 |

**책임**:
- 주문 이벤트 생성 및 저장
- 이벤트 타입별 페이로드 구성
- 이벤트 조회

---

#### OrderNotificationService (알림 발송)

| 메서드 | 이동 후 이름 | 책임 |
|--------|-------------|------|
| `sendOrderNotifications` | `sendOrderCreatedNotifications` | 주문 생성 알림 |
| (새로 작성) | `sendStatusChangedNotifications` | 상태 변경 알림 |
| (새로 작성) | `sendCancellationNotifications` | 취소 알림 |
| (새로 작성) | `sendRefundNotifications` | 환불 알림 |

**책임**:
- NotificationService 래핑
- 역할별 알림 발송 (판매자, 공급자, 구매자)
- 알림 템플릿 선택

---

#### OrderQueryService (조회)

| 메서드 | 이동 후 이름 | 책임 |
|--------|-------------|------|
| `getOrders` | `getOrders` | 주문 목록 조회 |
| `getOrderById` | `getOrderById` | 주문 상세 조회 |
| `getOrderStats` | `getOrderStats` | 주문 통계 |
| `getOrdersForSeller` | `getOrdersForSeller` | 판매자 주문 조회 |
| `getOrdersForSupplier` | `getOrdersForSupplier` | 공급자 주문 조회 |

**책임**:
- 주문 조회 및 필터링
- 역할별 주문 조회
- 주문 통계

---

#### OrderService (Refactored - Coordinator)

**남는 public 메서드**:
- `createOrder` - OrderCreationService + OrderCommissionService + OrderEventService + OrderNotificationService 조합
- `createOrderFromCart` - 동일
- `getOrders` - OrderQueryService에 위임
- `getOrderById` - OrderQueryService에 위임
- `updateOrderStatus` - OrderStatusService + OrderEventService + OrderNotificationService 조합
- `updatePaymentStatus` - OrderStatusService + OrderEventService 조합
- `cancelOrder` - OrderStatusService + OrderCommissionService + OrderEventService + OrderNotificationService 조합
- `requestRefund` - OrderStatusService + OrderEventService 조합
- (기타 public 메서드는 해당 서비스에 위임)

**책임**:
- 외부 API 인터페이스 유지
- 여러 서비스를 조합하여 복잡한 워크플로우 처리
- 트랜잭션 경계 관리

---

## 3. Phase별 상세 작업 계획

### Phase 1: 이벤트 & 알림 분리 ⭐ START HERE

**목표**: 이벤트 생성과 알림 발송 로직을 독립 서비스로 분리

#### Step 1.1: OrderEventService 생성

```typescript
// apps/api-server/src/services/order/OrderEventService.ts
import { EntityManager, Repository } from 'typeorm';
import { OrderEvent, OrderEventType, OrderEventPayload } from '../../entities/OrderEvent.js';
import { AppDataSource } from '../../database/connection.js';

export class OrderEventService {
  private orderEventRepository: Repository<OrderEvent>;

  constructor() {
    this.orderEventRepository = AppDataSource.getRepository(OrderEvent);
  }

  /**
   * 이벤트 생성 (트랜잭션 내부에서 사용)
   */
  async createEvent(
    manager: EntityManager,
    orderId: string,
    eventType: OrderEventType,
    payload: OrderEventPayload
  ): Promise<OrderEvent> {
    const event = new OrderEvent();
    event.orderId = orderId;
    event.type = eventType;
    event.payload = payload;

    return await manager.save(OrderEvent, event);
  }

  /**
   * ORDER_CREATED 이벤트 생성
   */
  createOrderCreatedPayload(
    actorId: string,
    actorName: string,
    actorRole: string
  ): OrderEventPayload {
    return {
      message: `Order created by ${actorName}`,
      actorId,
      actorName,
      actorRole,
      source: 'web'
    };
  }

  // ... (다른 이벤트 타입별 헬퍼 메서드)

  /**
   * 주문의 모든 이벤트 조회
   */
  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    return await this.orderEventRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' }
    });
  }
}
```

**작업 내용**:
1. `OrderEventService.ts` 파일 생성
2. `createOrderEvent` 메서드를 `createEvent`로 이동
3. 이벤트 타입별 페이로드 헬퍼 메서드 추가
4. `getOrderWithEvents` 로직을 `getOrderEvents`로 이동

**커밋**: `refactor(order): Extract OrderEventService from OrderService`

---

#### Step 1.2: OrderNotificationService 생성

```typescript
// apps/api-server/src/services/order/OrderNotificationService.ts
import { Order } from '../../entities/Order.js';
import { notificationService } from '../NotificationService.js';
import logger from '../../utils/logger.js';

export class OrderNotificationService {
  /**
   * 주문 생성 시 알림 발송
   */
  async sendOrderCreatedNotifications(order: Order): Promise<void> {
    // 기존 sendOrderNotifications 로직 이동
    // ...
  }

  /**
   * 상태 변경 시 알림 발송
   */
  async sendStatusChangedNotifications(
    order: Order,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    // 상태 변경 알림 로직
    // ...
  }

  // ... (다른 알림 타입)
}
```

**작업 내용**:
1. `OrderNotificationService.ts` 파일 생성
2. `sendOrderNotifications` 메서드 이동
3. 다른 알림 타입별 메서드 추가 (상태 변경, 취소, 환불 등)

**커밋**: `refactor(order): Extract OrderNotificationService from OrderService`

---

#### Step 1.3: OrderService에서 이벤트/알림 로직 제거

**작업 내용**:
1. `OrderService` 생성자에 `OrderEventService`, `OrderNotificationService` 추가
2. `createOrder` 메서드에서:
   - `this.createOrderEvent` → `this.orderEventService.createEvent` 호출로 변경
   - `this.sendOrderNotifications` → `this.orderNotificationService.sendOrderCreatedNotifications` 호출로 변경
3. 다른 메서드들도 동일하게 수정
4. private 메서드 `createOrderEvent`, `sendOrderNotifications` 제거

**커밋**: `refactor(order): Use OrderEventService and OrderNotificationService in OrderService`

---

#### Step 1.4: 테스트 및 검증

**테스트 시나리오**:
1. 주문 생성 시 이벤트가 정상 생성되는지 확인
2. 주문 생성 시 알림이 정상 발송되는지 확인
3. 상태 변경 시 이벤트/알림이 정상 작동하는지 확인

**Done 기준**:
- 모든 이벤트/알림 로직이 독립 서비스로 이동됨
- OrderService가 약 150 lines 감소
- 기능 테스트 통과

---

### Phase 2: 커미션 계산 분리

**목표**: 주문 항목 커미션 계산과 파트너 커미션 관리를 독립 서비스로 분리

#### Step 2.1: OrderCommissionService 생성

```typescript
// apps/api-server/src/services/order/OrderCommissionService.ts
import { EntityManager, Repository } from 'typeorm';
import { OrderItem } from '../../entities/Order.js';
import { PartnerCommission } from '../../entities/PartnerCommission.js';
import { CommissionCalculator } from '../CommissionCalculator.js';
import { AppDataSource } from '../../database/connection.js';

export class OrderCommissionService {
  private commissionCalculator: CommissionCalculator;
  private partnerCommissionRepository: Repository<PartnerCommission>;

  constructor() {
    this.commissionCalculator = new CommissionCalculator();
    this.partnerCommissionRepository = AppDataSource.getRepository(PartnerCommission);
  }

  /**
   * 주문 항목별 커미션 계산
   */
  async calculateItemCommissions(items: OrderItem[]): Promise<OrderItem[]> {
    for (const item of items) {
      if (!item.sellerId) {
        logger.warn(`Order item missing sellerId: ${item.productId}`);
        continue;
      }

      const commissionResult = await this.commissionCalculator.calculateForItem(
        item.productId,
        item.sellerId,
        item.unitPrice,
        item.quantity
      );

      item.commissionType = commissionResult.type;
      item.commissionRate = commissionResult.rate;
      item.commissionAmount = commissionResult.amount;

      logger.debug('Commission calculated for order item', {
        productId: item.productId,
        sellerId: item.sellerId,
        type: commissionResult.type,
        rate: commissionResult.rate,
        amount: commissionResult.amount
      });
    }

    return items;
  }

  /**
   * 파트너 커미션 생성
   */
  async createPartnerCommissions(
    manager: EntityManager,
    order: Order,
    referralCode?: string
  ): Promise<PartnerCommission[]> {
    // 기존 createPartnerCommissions 로직 이동
    // ...
  }

  // ... (다른 파트너 커미션 메서드)
}
```

**작업 내용**:
1. `OrderCommissionService.ts` 파일 생성
2. 주문 항목 커미션 계산 로직을 `calculateItemCommissions`로 추출
3. `createPartnerCommissions` 메서드 이동
4. `confirmPartnerCommissions`, `cancelPartnerCommissions` 메서드 이동
5. `getOrderCommissions`, `trackReferralClick` 메서드 이동
6. `updatePartnerPerformance` private 메서드 이동

**커밋**: `refactor(order): Extract OrderCommissionService from OrderService`

---

#### Step 2.2: OrderService에서 커미션 로직 제거

**작업 내용**:
1. `OrderService` 생성자에 `OrderCommissionService` 추가
2. `createOrder` 메서드에서:
   - 항목별 커미션 계산 로직 → `this.orderCommissionService.calculateItemCommissions` 호출로 변경
3. 파트너 커미션 관련 메서드들을 OrderCommissionService에 위임
4. private 메서드 `updatePartnerPerformance` 제거

**커밋**: `refactor(order): Use OrderCommissionService in OrderService`

---

#### Step 2.3: 테스트 및 검증

**테스트 시나리오**:
1. 주문 생성 시 항목별 커미션이 정상 계산되는지 확인
2. 파트너 추천 코드가 있는 경우 파트너 커미션이 생성되는지 확인
3. 주문 확정/취소 시 파트너 커미션 상태가 정상 변경되는지 확인

**Done 기준**:
- 모든 커미션 로직이 OrderCommissionService로 이동됨
- OrderService가 약 200 lines 감소
- 기능 테스트 통과

---

### Phase 3: 조회 로직 분리

**목표**: 주문 조회 및 통계 로직을 독립 서비스로 분리

#### Step 3.1: OrderQueryService 생성

```typescript
// apps/api-server/src/services/order/OrderQueryService.ts
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from '../../entities/Order.js';
import { OrderFilters } from '../OrderService.js';
import { AppDataSource } from '../../database/connection.js';

export class OrderQueryService {
  private orderRepository: Repository<Order>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
  }

  /**
   * 주문 목록 조회
   */
  async getOrders(filters: OrderFilters = {}): Promise<{ orders: Order[], total: number }> {
    // 기존 getOrders 로직 이동
    // ...
  }

  /**
   * 주문 상세 조회
   */
  async getOrderById(orderId: string, buyerId?: string): Promise<Order> {
    // 기존 getOrderById 로직 이동
    // ...
  }

  /**
   * 주문 통계
   */
  async getOrderStats(buyerId?: string): Promise<any> {
    // 기존 getOrderStats 로직 이동
    // ...
  }

  /**
   * 판매자 주문 조회
   */
  async getOrdersForSeller(sellerId: string, filters: OrderFilters = {}): Promise<{ orders: Order[], total: number }> {
    // 기존 getOrdersForSeller 로직 이동
    // ...
  }

  /**
   * 공급자 주문 조회
   */
  async getOrdersForSupplier(supplierId: string, filters: OrderFilters = {}): Promise<{ orders: Order[], total: number }> {
    // 기존 getOrdersForSupplier 로직 이동
    // ...
  }
}
```

**작업 내용**:
1. `OrderQueryService.ts` 파일 생성
2. 조회 관련 메서드 5개 이동
3. 필터링 및 정렬 로직 유지

**커밋**: `refactor(order): Extract OrderQueryService from OrderService`

---

#### Step 3.2: OrderService에서 조회 로직 제거

**작업 내용**:
1. `OrderService` 생성자에 `OrderQueryService` 추가
2. 조회 메서드들을 OrderQueryService에 위임

**커밋**: `refactor(order): Use OrderQueryService in OrderService`

---

### Phase 4: 주문 생성 로직 정리

**목표**: 주문 생성 로직을 독립 서비스로 분리

#### Step 4.1: OrderCreationService 생성

```typescript
// apps/api-server/src/services/order/OrderCreationService.ts
import { EntityManager, Repository } from 'typeorm';
import { Order, OrderItem, OrderStatus, PaymentStatus } from '../../entities/Order.js';
import { User } from '../../entities/User.js';
import { Cart } from '../../entities/Cart.js';
import { AppDataSource } from '../../database/connection.js';

export class OrderCreationService {
  private orderRepository: Repository<Order>;
  private userRepository: Repository<User>;
  private cartRepository: Repository<Cart>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.userRepository = AppDataSource.getRepository(User);
    this.cartRepository = AppDataSource.getRepository(Cart);
  }

  /**
   * 항목 기반 주문 생성 (커미션 제외)
   */
  async createOrderFromItems(
    manager: EntityManager,
    buyerId: string,
    items: OrderItem[],
    billingAddress: Address,
    shippingAddress: Address,
    paymentMethod: PaymentMethod,
    notes?: string,
    customerNotes?: string
  ): Promise<Order> {
    // 구매자 정보 조회
    const buyer = await this.userRepository.findOne({ where: { id: buyerId } });
    if (!buyer) {
      throw new Error('Buyer not found');
    }

    // 항목 검증
    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // 주문 요약 계산
    const summary = this.calculateOrderSummary(items);

    // 주문 생성
    const order = new Order();
    order.orderNumber = this.generateOrderNumber();
    order.buyerId = buyerId;
    order.buyerType = buyer.role;
    order.buyerName = buyer.name;
    order.buyerEmail = buyer.email;
    order.items = items;
    order.summary = summary;
    order.billingAddress = billingAddress;
    order.shippingAddress = shippingAddress;
    order.paymentMethod = paymentMethod;
    order.notes = notes;
    order.customerNotes = customerNotes;
    order.status = OrderStatus.PENDING;
    order.paymentStatus = PaymentStatus.PENDING;

    return await manager.save(Order, order);
  }

  /**
   * 장바구니 기반 주문 생성
   */
  async createOrderFromCart(
    manager: EntityManager,
    buyerId: string,
    cartId: string,
    billingAddress: Address,
    shippingAddress: Address,
    paymentMethod: PaymentMethod,
    notes?: string,
    customerNotes?: string
  ): Promise<Order> {
    // 장바구니 조회 및 항목 변환
    const cart = await this.cartRepository.findOne({
      where: { userId: buyerId },
      relations: ['items', 'items.product']
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // 장바구니 항목을 주문 항목으로 변환
    const orderItems: OrderItem[] = cart.items.map(cartItem => ({
      // ... 변환 로직
    }));

    // 항목 기반 주문 생성 호출
    return await this.createOrderFromItems(
      manager,
      buyerId,
      orderItems,
      billingAddress,
      shippingAddress,
      paymentMethod,
      notes,
      customerNotes
    );
  }

  /**
   * 주문 번호 생성
   */
  private generateOrderNumber(): string {
    // 기존 generateOrderNumber 로직
    // ...
  }

  /**
   * 주문 요약 계산
   */
  private calculateOrderSummary(items: OrderItem[]): OrderSummary {
    // 기존 calculateOrderSummary 로직
    // ...
  }
}
```

**작업 내용**:
1. `OrderCreationService.ts` 파일 생성
2. 주문 생성 로직을 커미션 계산과 분리
3. `generateOrderNumber`, `calculateOrderSummary` private 메서드 이동

**커밋**: `refactor(order): Extract OrderCreationService from OrderService`

---

#### Step 4.2: OrderService.createOrder 재구성

**작업 내용**:
1. `OrderService.createOrder` 메서드를 다음과 같이 재구성:

```typescript
async createOrder(buyerId: string, request: CreateOrderRequest): Promise<Order> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. 커미션 계산
    const itemsWithCommissions = await this.orderCommissionService.calculateItemCommissions(
      request.items
    );

    // 2. 주문 생성
    const order = await this.orderCreationService.createOrderFromItems(
      queryRunner.manager,
      buyerId,
      itemsWithCommissions,
      request.billingAddress,
      request.shippingAddress,
      request.paymentMethod,
      request.notes,
      request.customerNotes
    );

    // 3. 이벤트 생성
    const payload = this.orderEventService.createOrderCreatedPayload(
      buyerId,
      order.buyerName,
      order.buyerType
    );
    await this.orderEventService.createEvent(
      queryRunner.manager,
      order.id,
      OrderEventType.ORDER_CREATED,
      payload
    );

    // 4. 파트너 커미션 생성 (referralCode가 있는 경우)
    if (request.referralCode) {
      await this.orderCommissionService.createPartnerCommissions(
        queryRunner.manager,
        order,
        request.referralCode
      );
    }

    await queryRunner.commitTransaction();

    logger.info(`Order created: ${order.orderNumber}`, {
      orderId: order.id,
      buyerId,
      total: order.summary.total
    });

    // 5. 알림 발송 (비동기)
    this.orderNotificationService.sendOrderCreatedNotifications(order).catch((err) => {
      logger.error('Failed to send order notifications:', err);
    });

    return order;

  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('Failed to create order:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

**커밋**: `refactor(order): Refactor OrderService.createOrder to use extracted services`

---

### Phase 5: 상태 관리 분리

**목표**: 주문 상태 변경 로직을 독립 서비스로 분리

#### Step 5.1: OrderStatusService 생성

```typescript
// apps/api-server/src/services/order/OrderStatusService.ts
import { EntityManager, Repository } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from '../../entities/Order.js';
import { AppDataSource } from '../../database/connection.js';

export class OrderStatusService {
  private orderRepository: Repository<Order>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
  }

  /**
   * 주문 상태 변경
   */
  async updateOrderStatus(
    manager: EntityManager,
    orderId: string,
    newStatus: OrderStatus,
    notes?: string
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new Error('Order not found');
    }

    // 상태 전환 검증
    this.validateStatusTransition(order.status, newStatus);

    // 상태 업데이트
    order.status = newStatus;
    if (notes) {
      order.notes = order.notes ? `${order.notes}\n${notes}` : notes;
    }

    return await manager.save(Order, order);
  }

  /**
   * 결제 상태 변경
   */
  async updatePaymentStatus(
    manager: EntityManager,
    orderId: string,
    paymentStatus: PaymentStatus
  ): Promise<Order> {
    // 기존 updatePaymentStatus 로직 이동
    // ...
  }

  /**
   * 주문 취소
   */
  async cancelOrder(
    manager: EntityManager,
    orderId: string,
    reason?: string
  ): Promise<Order> {
    // 기존 cancelOrder 로직 이동
    // ...
  }

  /**
   * 환불 요청
   */
  async requestRefund(
    manager: EntityManager,
    orderId: string,
    reason: string,
    amount?: number
  ): Promise<Order> {
    // 기존 requestRefund 로직 이동
    // ...
  }

  /**
   * 배송 정보 업데이트
   */
  async updateOrderShipping(
    manager: EntityManager,
    orderId: string,
    shippingInfo: any
  ): Promise<Order> {
    // 기존 updateOrderShipping 로직 이동
    // ...
  }

  /**
   * 상태 전환 검증
   */
  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): void {
    // 기존 validateStatusTransition 로직
    // ...
  }

  /**
   * 상태 표시명
   */
  getStatusDisplayName(status: OrderStatus): string {
    // 기존 getStatusDisplayName 로직
    // ...
  }
}
```

**작업 내용**:
1. `OrderStatusService.ts` 파일 생성
2. 상태 관리 관련 메서드 7개 이동

**커밋**: `refactor(order): Extract OrderStatusService from OrderService`

---

#### Step 5.2: OrderService에서 상태 관리 로직 제거

**작업 내용**:
1. `OrderService` 생성자에 `OrderStatusService` 추가
2. 상태 관리 메서드들을 OrderStatusService에 위임
3. 각 메서드에서 이벤트 생성 및 알림 발송 추가

**커밋**: `refactor(order): Use OrderStatusService in OrderService`

---

### Phase 6: 통합 및 정리

**목표**: 전체 리팩토링 완료 및 최종 검증

#### Step 6.1: OrderService 최종 정리

**작업 내용**:
1. 모든 private 메서드가 제거되었는지 확인
2. 의존성 주입이 올바르게 되었는지 확인
3. public API가 유지되는지 확인
4. 트랜잭션 경계 재검토

**최종 OrderService 구조**:

```typescript
export class OrderService {
  private orderCreationService: OrderCreationService;
  private orderCommissionService: OrderCommissionService;
  private orderStatusService: OrderStatusService;
  private orderEventService: OrderEventService;
  private orderNotificationService: OrderNotificationService;
  private orderQueryService: OrderQueryService;

  constructor() {
    this.orderCreationService = new OrderCreationService();
    this.orderCommissionService = new OrderCommissionService();
    this.orderStatusService = new OrderStatusService();
    this.orderEventService = new OrderEventService();
    this.orderNotificationService = new OrderNotificationService();
    this.orderQueryService = new OrderQueryService();
  }

  // Public API methods - 각 메서드는 적절한 서비스들을 조합하여 사용
  async createOrder(buyerId: string, request: CreateOrderRequest): Promise<Order> { /* ... */ }
  async createOrderFromCart(buyerId: string, request: CreateOrderFromCartRequest): Promise<Order> { /* ... */ }
  async getOrders(filters: OrderFilters): Promise<{ orders: Order[], total: number }> { /* ... */ }
  async getOrderById(orderId: string, buyerId?: string): Promise<Order> { /* ... */ }
  async updateOrderStatus(orderId: string, newStatus: OrderStatus, notes?: string): Promise<Order> { /* ... */ }
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<Order> { /* ... */ }
  async cancelOrder(orderId: string, reason?: string): Promise<Order> { /* ... */ }
  async requestRefund(orderId: string, reason: string, amount?: number): Promise<Order> { /* ... */ }
  async getOrderStats(buyerId?: string): Promise<any> { /* ... */ }
  async createPartnerCommissions(order: Order, referralCode?: string): Promise<PartnerCommission[]> { /* ... */ }
  async confirmPartnerCommissions(orderId: string): Promise<void> { /* ... */ }
  async cancelPartnerCommissions(orderId: string, reason: string): Promise<void> { /* ... */ }
  async getOrderCommissions(orderId: string): Promise<PartnerCommission[]> { /* ... */ }
  async trackReferralClick(referralCode: string, metadata?: any): Promise<boolean> { /* ... */ }
  async getOrdersForSeller(sellerId: string, filters: OrderFilters): Promise<{ orders: Order[], total: number }> { /* ... */ }
  async getOrdersForSupplier(supplierId: string, filters: OrderFilters): Promise<{ orders: Order[], total: number }> { /* ... */ }
  async updateOrderShipping(orderId: string, shippingInfo: any): Promise<Order> { /* ... */ }
  async getOrderWithEvents(orderId: string, buyerId?: string): Promise<Order> { /* ... */ }
}
```

**커밋**: `refactor(order): Finalize OrderService refactoring`

---

#### Step 6.2: 컨트롤러 및 라우트 확인

**작업 내용**:
1. `OrderController`에서 OrderService 사용이 정상인지 확인
2. 모든 API 엔드포인트가 정상 작동하는지 확인

---

#### Step 6.3: 최종 검증

**검증 항목**:
1. **파일 크기**:
   - OrderService.ts: 300 lines 이하 ✅
   - 새로운 서비스 파일들: 각 200 lines 이하 ✅

2. **Public API**:
   - 모든 public 메서드가 동일한 시그니처 ✅
   - 응답 형식이 동일 ✅

3. **기능 테스트**:
   - 7개 핵심 시나리오 모두 통과 ✅

4. **코드 품질**:
   - 각 서비스가 SRP를 따름 ✅
   - 의존성이 명확히 분리됨 ✅
   - 트랜잭션 경계가 유지됨 ✅

**커밋**: `docs(order): Add refactoring documentation`

---

## 4. 새로운 서비스 파일 구조

### 4.1 디렉터리 구조

```
apps/api-server/src/services/
  order/
    OrderCreationService.ts          (~200 lines)
    OrderSplittingService.ts         (~150 lines) [DS 단계에서 추가 예정]
    OrderCommissionService.ts        (~150 lines)
    OrderStatusService.ts            (~200 lines)
    OrderEventService.ts             (~100 lines)
    OrderNotificationService.ts      (~80 lines)
    OrderQueryService.ts             (~150 lines)
    types.ts                         (공통 타입 정의)

  OrderService.ts (refactored)       (~300 lines)
  CommissionCalculator.ts            (기존)
  NotificationService.ts             (기존)
```

### 4.2 타입 정의 파일

```typescript
// apps/api-server/src/services/order/types.ts
export { CreateOrderRequest, CreateOrderFromCartRequest, OrderFilters } from '../OrderService.js';
```

---

## 5. 테스트 시나리오

### 5.1 핵심 시나리오 (반드시 통과해야 함)

#### 시나리오 1: 일반 주문 생성

```typescript
const request: CreateOrderRequest = {
  items: [
    {
      productId: 'prod-1',
      productName: 'Test Product',
      sellerId: 'seller-1',
      quantity: 2,
      unitPrice: 10000,
      // ...
    }
  ],
  billingAddress: { /* ... */ },
  shippingAddress: { /* ... */ },
  paymentMethod: PaymentMethod.CARD
};

const order = await orderService.createOrder('buyer-1', request);

// 검증
expect(order.orderNumber).toBeDefined();
expect(order.items[0].commissionAmount).toBeGreaterThan(0);
expect(order.status).toBe(OrderStatus.PENDING);
```

**Expected**:
- 주문 생성 ✅
- 커미션 계산 ✅
- ORDER_CREATED 이벤트 생성 ✅
- 알림 발송 ✅

---

#### 시나리오 2: 파트너 추천 코드가 있는 주문

```typescript
const request: CreateOrderRequest = {
  // ...
  referralCode: 'PARTNER123'
};

const order = await orderService.createOrder('buyer-1', request);

// 검증
const commissions = await orderService.getOrderCommissions(order.id);
expect(commissions.length).toBeGreaterThan(0);
expect(commissions[0].partnerId).toBe('partner-1');
expect(commissions[0].status).toBe(CommissionStatus.PENDING);
```

**Expected**:
- 파트너 커미션 생성 ✅
- 커미션 상태: PENDING ✅

---

#### 시나리오 3: 장바구니에서 주문 생성

```typescript
const request: CreateOrderFromCartRequest = {
  cartId: 'cart-1',
  billingAddress: { /* ... */ },
  shippingAddress: { /* ... */ },
  paymentMethod: PaymentMethod.CARD
};

const order = await orderService.createOrderFromCart('buyer-1', request);

// 검증
expect(order.items.length).toBeGreaterThan(0);
expect(order.items[0].commissionAmount).toBeGreaterThan(0);
```

**Expected**:
- 장바구니 항목이 주문 항목으로 변환 ✅
- 커미션 계산 ✅

---

#### 시나리오 4: 주문 상태 변경

```typescript
const order = await orderService.createOrder('buyer-1', request);

// 상태 변경: PENDING → CONFIRMED
await orderService.updateOrderStatus(order.id, OrderStatus.CONFIRMED);

// 검증
const updatedOrder = await orderService.getOrderById(order.id);
expect(updatedOrder.status).toBe(OrderStatus.CONFIRMED);

// 이벤트 확인
const orderWithEvents = await orderService.getOrderWithEvents(order.id);
expect(orderWithEvents.events.length).toBeGreaterThanOrEqual(2);
expect(orderWithEvents.events[1].type).toBe(OrderEventType.STATUS_CHANGED);
```

**Expected**:
- 상태 변경 ✅
- STATUS_CHANGED 이벤트 생성 ✅
- 알림 발송 ✅

---

#### 시나리오 5: 주문 취소

```typescript
const order = await orderService.createOrder('buyer-1', request);

await orderService.cancelOrder(order.id, 'Customer requested cancellation');

// 검증
const cancelledOrder = await orderService.getOrderById(order.id);
expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);

// 파트너 커미션 확인 (있는 경우)
if (request.referralCode) {
  const commissions = await orderService.getOrderCommissions(order.id);
  expect(commissions[0].status).toBe(CommissionStatus.CANCELLED);
}
```

**Expected**:
- 주문 상태: CANCELLED ✅
- 파트너 커미션 상태: CANCELLED ✅
- ORDER_CANCELLED 이벤트 생성 ✅
- 취소 알림 발송 ✅

---

#### 시나리오 6: 결제 상태 변경

```typescript
const order = await orderService.createOrder('buyer-1', request);

await orderService.updatePaymentStatus(order.id, PaymentStatus.PAID);

// 검증
const paidOrder = await orderService.getOrderById(order.id);
expect(paidOrder.paymentStatus).toBe(PaymentStatus.PAID);
```

**Expected**:
- 결제 상태 변경 ✅
- PAYMENT_STATUS_CHANGED 이벤트 생성 ✅

---

#### 시나리오 7: 환불 요청

```typescript
const order = await orderService.createOrder('buyer-1', request);
await orderService.updateOrderStatus(order.id, OrderStatus.COMPLETED);

await orderService.requestRefund(order.id, 'Product defect', order.summary.total);

// 검증
const refundedOrder = await orderService.getOrderById(order.id);
expect(refundedOrder.status).toBe(OrderStatus.REFUND_REQUESTED);
```

**Expected**:
- 주문 상태: REFUND_REQUESTED ✅
- REFUND_REQUESTED 이벤트 생성 ✅
- 환불 알림 발송 ✅

---

### 5.2 추가 시나리오 (선택)

- 판매자 주문 조회
- 공급자 주문 조회
- 주문 통계 조회
- 배송 정보 업데이트
- 추천 클릭 추적

---

## 6. 체크리스트

### 6.1 Phase별 체크리스트

#### Phase 1: 이벤트 & 알림 분리

- [ ] OrderEventService.ts 파일 생성
- [ ] OrderNotificationService.ts 파일 생성
- [ ] OrderService에서 이벤트/알림 로직 제거
- [ ] 기능 테스트 통과
- [ ] 커밋 3개 완료

#### Phase 2: 커미션 계산 분리

- [ ] OrderCommissionService.ts 파일 생성
- [ ] OrderService에서 커미션 로직 제거
- [ ] 기능 테스트 통과
- [ ] 커밋 2개 완료

#### Phase 3: 조회 로직 분리

- [ ] OrderQueryService.ts 파일 생성
- [ ] OrderService에서 조회 로직 제거
- [ ] 기능 테스트 통과
- [ ] 커밋 2개 완료

#### Phase 4: 주문 생성 로직 정리

- [ ] OrderCreationService.ts 파일 생성
- [ ] OrderService.createOrder 재구성
- [ ] 기능 테스트 통과
- [ ] 커밋 2개 완료

#### Phase 5: 상태 관리 분리

- [ ] OrderStatusService.ts 파일 생성
- [ ] OrderService에서 상태 관리 로직 제거
- [ ] 기능 테스트 통과
- [ ] 커밋 2개 완료

#### Phase 6: 통합 및 정리

- [ ] OrderService 최종 정리
- [ ] 컨트롤러 확인
- [ ] 최종 검증
- [ ] 문서 작성
- [ ] 커밋 2개 완료

---

### 6.2 최종 검증 체크리스트

#### 파일 크기

- [ ] OrderService.ts: 300 lines 이하
- [ ] OrderCreationService.ts: 200 lines 이하
- [ ] OrderCommissionService.ts: 150 lines 이하
- [ ] OrderStatusService.ts: 200 lines 이하
- [ ] OrderEventService.ts: 100 lines 이하
- [ ] OrderNotificationService.ts: 80 lines 이하
- [ ] OrderQueryService.ts: 150 lines 이하

#### Public API

- [ ] 모든 public 메서드 시그니처 동일
- [ ] 응답 형식 동일
- [ ] 에러 처리 동일

#### 기능 테스트

- [ ] 시나리오 1: 일반 주문 생성
- [ ] 시나리오 2: 파트너 추천 코드
- [ ] 시나리오 3: 장바구니 주문
- [ ] 시나리오 4: 상태 변경
- [ ] 시나리오 5: 주문 취소
- [ ] 시나리오 6: 결제 상태 변경
- [ ] 시나리오 7: 환불 요청

#### 코드 품질

- [ ] 각 서비스가 SRP 준수
- [ ] 의존성 명확히 분리
- [ ] 트랜잭션 경계 유지
- [ ] 로그 메시지 유지
- [ ] 에러 메시지 유지

#### 문서

- [ ] 각 서비스의 역할 명확히 문서화
- [ ] 메서드별 JSDoc 주석 작성
- [ ] 리팩토링 이력 기록

---

## 7. 예상 결과

### 7.1 정량적 개선

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| OrderService.ts 라인 수 | 1183 | ~300 | 75% 감소 |
| 메서드 복잡도 (HIGH) | 4개 | 0개 | 100% 개선 |
| 서비스 파일 수 | 1개 | 7개 | 책임 분산 |
| 평균 메서드 길이 | ~40 lines | ~20 lines | 50% 감소 |

### 7.2 정성적 개선

- ✅ 각 서비스의 역할이 명확함
- ✅ 단위 테스트 작성이 용이함
- ✅ 새로운 기능 추가 시 영향 범위가 명확함
- ✅ 코드 리뷰가 용이함
- ✅ DS 단계 분석이 용이함

---

## 8. 다음 단계

C-2-A-1 완료 후:

1. **C-2-A-2**: CommissionEngine 리팩토링
2. **C-2-A-3**: SettlementManagementService 리팩토링
3. **C-2-A-4**: SellerProductService 리팩토링

---

**작업 시작 준비 완료 ✅**

이 계획대로 Phase 1부터 순차적으로 진행하시면 됩니다.
각 Phase는 독립적으로 커밋 가능하므로, 언제든지 중단하고 재개할 수 있습니다.

**문서 끝**
