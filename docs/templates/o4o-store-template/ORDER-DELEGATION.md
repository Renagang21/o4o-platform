# Order Delegation Pattern

> **Phase 8 확정 문서**
> O4O 매장의 주문 위임 패턴을 정의한다.

## 1. 핵심 원칙

O4O 매장은 **주문을 직접 생성하지 않는다**.
모든 주문은 E-commerce Core를 통해 `checkout_orders` 테이블에 저장된다.

```
[매장 서비스] → checkoutService.createOrder() → [checkout_orders]
                         ↓
                  [checkout_payments]
                         ↓
                  [정산/리포트]
```

## 2. 표준 주문 생성 코드

### 2.1 Controller 구현

```typescript
/**
 * {Store} Order Controller
 *
 * ## 설계 원칙
 * - {Store} 자체 주문 테이블 없음
 * - 모든 주문은 E-commerce Core로 위임
 * - OrderType = {STORE_TYPE} 고정
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { checkoutService, type OrderItem } from '../../../services/checkout.service.js';
import { OrderType } from '../../../entities/checkout/CheckoutOrder.entity.js';

// ============================================================================
// Type Definitions
// ============================================================================

interface {Store}OrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface {Store}OrderMetadata {
  // 매장별 메타데이터 정의
  storeId?: string;
  storeName?: string;
  // ... 매장 특화 필드
}

interface Create{Store}OrderDto {
  sellerId: string;
  items: {Store}OrderItemDto[];
  metadata: {Store}OrderMetadata;
  shippingAddress?: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };
  shippingFee?: number;
  discount?: number;
}

// ============================================================================
// Controller Implementation
// ============================================================================

export function create{Store}OrderController(
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  /**
   * POST /{store}/orders
   * Create a new {store} order
   */
  router.post(
    '/',
    requireAuth,
    requireScope('{store}:write'),
    [
      body('sellerId').notEmpty().isUUID(),
      body('items').isArray({ min: 1 }),
      body('items.*.productId').notEmpty().isUUID(),
      body('items.*.productName').notEmpty().isString(),
      body('items.*.quantity').isInt({ min: 1 }),
      body('items.*.unitPrice').isInt({ min: 0 }),
      body('metadata').notEmpty().isObject(),
    ],
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
          });
        }

        const dto: Create{Store}OrderDto = req.body;

        // ================================================================
        // E-commerce Core 주문 위임 (필수 패턴)
        // ================================================================

        const orderItems: OrderItem[] = dto.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice - (item.discount || 0),
        }));

        const order = await checkoutService.createOrder({
          orderType: OrderType.{STORE_TYPE},  // 매장 타입 고정
          buyerId,
          sellerId: dto.sellerId,
          supplierId: dto.sellerId,
          items: orderItems,
          shippingAddress: dto.shippingAddress,
          metadata: {
            ...dto.metadata,
            originalItems: dto.items,
          },
        });

        // 응답
        res.status(201).json({
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: '{STORE_TYPE}',
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
          },
          message: 'Order created successfully',
        });
      } catch (error: any) {
        logger.error('[{Store} Order] Create error:', error);
        res.status(500).json({
          error: { code: 'ORDER_CREATE_ERROR', message: 'Failed to create order' }
        });
      }
    }
  );

  return router;
}
```

## 3. 주문 조회 패턴

주문 조회는 E-commerce Core를 통해 수행한다.

```typescript
/**
 * GET /{store}/orders
 * List orders for current user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const buyerId = (req as AuthRequest).user?.id;

  // E-commerce Core에서 조회
  const orders = await checkoutService.findByBuyerId(buyerId);

  // 매장 타입으로 필터링
  const storeOrders = orders.filter(
    (order) => order.orderType === OrderType.{STORE_TYPE}
  );

  res.json({ data: storeOrders });
});
```

## 4. 메타데이터 활용

매장별 특화 정보는 `metadata` 필드에 저장한다.

### 4.1 Tourism 예시

```typescript
metadata: {
  packageId: 'pkg-123',
  packageName: '제주 3일 투어',
  destinationId: 'dest-456',
  tourDate: '2026-02-15',
  participants: 4,
  pickupLocation: '제주공항',
}
```

### 4.2 Cosmetics 예시

```typescript
metadata: {
  channel: 'travel',
  storeId: 'store-789',
  travel: {
    guideId: 'guide-123',
    tourSessionId: 'session-456',
    taxRefund: {
      eligible: true,
      scheme: 'instant',
    },
  },
}
```

## 5. 금지 패턴

### 5.1 직접 테이블 INSERT (금지)

```typescript
// ❌ 절대 금지
await this.orderRepository.save({
  orderNumber: '...',
  buyerId: '...',
  // ...
});
```

### 5.2 자체 Order Entity (금지)

```typescript
// ❌ 절대 금지
@Entity('{store}_orders')
export class {Store}Order {
  // ...
}
```

### 5.3 checkoutService 우회 (금지)

```typescript
// ❌ 절대 금지
import { AppDataSource } from '../../../database/data-source.js';
const orderRepo = AppDataSource.getRepository(CheckoutOrder);
await orderRepo.save({ ... });
```

## 6. 정산/리포트 연동

매장 주문은 자동으로 정산/리포트에 포함된다.

```typescript
// Phase 7에서 구현된 정산 API
const summary = await checkoutService.getSettlementSummary({
  periodStart,
  periodEnd,
  orderType: OrderType.{STORE_TYPE},  // 매장별 필터
  groupBy: 'supplierId',
});
```

---

*Phase 8 (2026-01-11) - O4O Store Template Standardization*
