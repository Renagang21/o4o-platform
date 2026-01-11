/**
 * Tourism Order Controller
 *
 * Phase 5-C: Tourism 서비스 최초 구현
 *
 * ## 설계 원칙
 * - Tourism 자체 주문 테이블 없음
 * - 모든 주문은 E-commerce Core로 위임
 * - OrderType = TOURISM 고정
 * - Dropshipping 상품을 패키지로 묶어 주문 가능
 *
 * ## 금지 사항
 * - tourism_orders 테이블 생성 ❌
 * - 직접 주문 저장 ❌
 * - checkoutService 미사용 ❌
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
 *
 * @since Phase 5-C (2026-01-11)
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

interface TourismOrderItemDto {
  /** Dropshipping 상품 ID (참조) */
  productId: string;
  /** 상품명 */
  productName: string;
  /** 수량 */
  quantity: number;
  /** 단가 */
  unitPrice: number;
  /** 할인 금액 */
  discount?: number;
  /** 패키지 아이템 ID (선택) */
  packageItemId?: string;
}

interface TourismOrderMetadata {
  /** 패키지 ID */
  packageId?: string;
  /** 패키지 이름 */
  packageName?: string;
  /** 관광지 ID */
  destinationId?: string;
  /** 관광지 이름 */
  destinationName?: string;
  /** 투어 날짜 */
  tourDate?: string;
  /** 참가 인원 */
  participants?: number;
  /** 가이드 요청 사항 */
  guideNotes?: string;
  /** 픽업 장소 */
  pickupLocation?: string;
  /** 픽업 시간 */
  pickupTime?: string;
}

interface CreateTourismOrderDto {
  /** 판매자 ID */
  sellerId: string;
  /** 주문 아이템 */
  items: TourismOrderItemDto[];
  /** Tourism 메타데이터 */
  metadata: TourismOrderMetadata;
  /** 배송 주소 (쇼핑 패키지용) */
  shippingAddress?: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };
  /** 배송비 */
  shippingFee?: number;
  /** 할인 금액 */
  discount?: number;
}

// ============================================================================
// Validation Errors
// ============================================================================

const VALIDATION_ERRORS = {
  ITEMS_REQUIRED: 'At least one order item is required',
  SELLER_ID_REQUIRED: 'sellerId is required',
  METADATA_REQUIRED: 'metadata is required',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Error response helper
 */
function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>
): Response {
  return res.status(statusCode).json({
    error: { code, message, details },
  });
}

/**
 * Validation error helper
 */
function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      fields: errors.mapped(),
    });
    return true;
  }
  return false;
}

// ============================================================================
// Controller Implementation
// ============================================================================

/**
 * Create tourism order router
 *
 * @param requireAuth 인증 미들웨어
 * @param requireScope 스코프 검증 미들웨어
 */
export function createTourismOrderController(
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  // ============================================================================
  // ORDER ENDPOINTS
  // ============================================================================

  /**
   * POST /tourism/orders
   * Create a new tourism order
   *
   * Phase 5-C: E-commerce Core 위임 구현
   * - Tourism 자체 주문 테이블 없음
   * - checkoutService.createOrder() 호출
   * - OrderType.TOURISM 사용
   */
  router.post(
    '/',
    requireAuth,
    requireScope('tourism:write'),
    [
      body('sellerId').notEmpty().isUUID().withMessage('sellerId must be a valid UUID'),
      body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
      body('items.*.productId').notEmpty().isUUID().withMessage('productId must be a valid UUID'),
      body('items.*.productName').notEmpty().isString().withMessage('productName is required'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
      body('items.*.unitPrice').isInt({ min: 0 }).withMessage('unitPrice must be non-negative'),
      body('items.*.discount').optional().isInt({ min: 0 }),
      body('metadata').notEmpty().isObject().withMessage('metadata is required'),
      body('shippingFee').optional().isInt({ min: 0 }),
      body('discount').optional().isInt({ min: 0 }),
    ],
    async (req: Request, res: Response) => {
      try {
        // express-validator 검증
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const dto: CreateTourismOrderDto = req.body;

        // ================================================================
        // Phase 5-C: E-commerce Core 주문 위임
        // - Tourism 자체 주문 테이블 없음
        // - 모든 주문은 checkout_orders 테이블에 저장
        // - OrderType.TOURISM 사용
        // ================================================================

        // E-commerce Core CreateOrderDto 형식으로 변환
        const orderItems: OrderItem[] = dto.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice - (item.discount || 0),
        }));

        // E-commerce Core를 통해 주문 생성
        const order = await checkoutService.createOrder({
          orderType: OrderType.TOURISM,
          buyerId,
          sellerId: dto.sellerId,
          supplierId: dto.sellerId, // Tourism에서는 sellerId = supplierId
          items: orderItems,
          shippingAddress: dto.shippingAddress ? {
            recipientName: dto.shippingAddress.recipientName,
            phone: dto.shippingAddress.phone,
            zipCode: dto.shippingAddress.zipCode,
            address1: dto.shippingAddress.address1,
            address2: dto.shippingAddress.address2,
            memo: dto.shippingAddress.memo,
          } : undefined,
          metadata: {
            ...dto.metadata,
            // Tourism 원본 아이템 정보 보존
            originalItems: dto.items,
          },
        });

        // 응답 형식 변환 (O4O 표준 매장 응답)
        const orderResponse = {
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: 'TOURISM',
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          status: order.status,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          discount: order.discount,
          totalAmount: order.totalAmount,
          currency: 'KRW',
          metadata: dto.metadata,
          items: dto.items.map((item, index) => ({
            id: `${order.id}-item-${index}`,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            subtotal: item.quantity * item.unitPrice - (item.discount || 0),
            packageItemId: item.packageItemId,
          })),
          shippingAddress: dto.shippingAddress,
          createdAt: order.createdAt,
        };

        // 로깅
        const logData: Record<string, any> = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          buyerId,
          sellerId: dto.sellerId,
          totalAmount: order.totalAmount,
          itemCount: dto.items.length,
          packageId: dto.metadata.packageId,
          destinationId: dto.metadata.destinationId,
          tourDate: dto.metadata.tourDate,
          participants: dto.metadata.participants,
        };

        logger.info('[Tourism Order] Created order via E-commerce Core:', logData);

        res.status(201).json({
          data: orderResponse,
          message: 'Tourism order created successfully',
        });
      } catch (error: any) {
        logger.error('[Tourism Order] Create order error:', error);
        errorResponse(res, 500, 'ORDER_CREATE_ERROR', 'Failed to create order');
      }
    }
  );

  /**
   * GET /tourism/orders
   * List orders for current user (buyer)
   *
   * Note: 실제 조회는 E-commerce Core의 checkout_orders에서 수행
   */
  router.get(
    '/',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        // E-commerce Core에서 TOURISM 주문 조회
        // Note: checkoutService에 orderType 필터가 추가되면 사용
        const orders = await checkoutService.findByBuyerId(buyerId);

        // TOURISM 주문만 필터링
        const tourismOrders = orders.filter(
          (order) => order.orderType === OrderType.TOURISM
        );

        logger.info('[Tourism Order] List orders:', {
          buyerId,
          totalOrders: orders.length,
          tourismOrders: tourismOrders.length,
        });

        res.json({
          data: tourismOrders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            metadata: order.metadata,
            createdAt: order.createdAt,
          })),
          pagination: {
            page: 1,
            limit: 20,
            total: tourismOrders.length,
            totalPages: 1,
          },
        });
      } catch (error: any) {
        logger.error('[Tourism Order] List orders error:', error);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  /**
   * GET /tourism/orders/:id
   * Get single order by ID
   */
  router.get(
    '/:id',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;
        const orderId = req.params.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        // E-commerce Core에서 주문 조회
        const order = await checkoutService.findById(orderId);

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        // TOURISM 주문인지 확인
        if (order.orderType !== OrderType.TOURISM) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        // 본인 주문인지 확인
        if (order.buyerId !== buyerId) {
          return errorResponse(res, 403, 'FORBIDDEN', 'Access denied');
        }

        res.json({
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            buyerId: order.buyerId,
            sellerId: order.sellerId,
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            totalAmount: order.totalAmount,
            items: order.items,
            metadata: order.metadata,
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        });
      } catch (error: any) {
        logger.error('[Tourism Order] Get order error:', error);
        errorResponse(res, 500, 'ORDER_GET_ERROR', 'Failed to get order');
      }
    }
  );

  return router;
}
