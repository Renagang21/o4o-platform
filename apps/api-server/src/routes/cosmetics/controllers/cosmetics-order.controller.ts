/**
 * Cosmetics Order Controller
 *
 * H2-0: metadata.channel 기반 주문 생성 API
 *
 * ## 설계 원칙
 * - OrderType = RETAIL 고정 (CosmeticsOrderService에서 처리)
 * - 채널 분기 = metadata.channel ('local' | 'travel')
 * - Cosmetics Product = UUID 참조 + 스냅샷
 *
 * @since H2-0 (2025-01-02)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import type { AuthRequest } from '../../../types/auth.js';

// ============================================================================
// Type Definitions (H1-2 확정 스키마와 동일)
// ============================================================================

type OrderChannel = 'local' | 'travel';
type FulfillmentType = 'pickup' | 'delivery' | 'on-site';

interface TaxRefundMeta {
  eligible: boolean;
  status?: 'pending' | 'applied' | 'completed' | 'rejected';
  amount?: number;
  applicationId?: string;
}

interface TravelChannelMeta {
  guideId: string;
  guideName?: string;
  tourSessionId?: string;
  tourDate?: string;
  groupSize?: number;
  taxRefund?: TaxRefundMeta;
}

interface LocalChannelMeta {
  sampleExperienced?: boolean;
  reservationId?: string;
}

interface CommissionMeta {
  partnerId?: string;
  referralCode?: string;
  rate?: number;
}

interface CosmeticsOrderMetadata {
  channel: OrderChannel;
  fulfillment?: FulfillmentType;
  storeId?: string;
  storeName?: string;
  travel?: TravelChannelMeta;
  local?: LocalChannelMeta;
  commission?: CommissionMeta;
}

interface ProductSnapshot {
  brandId?: string;
  brandName?: string;
  lineId?: string;
  lineName?: string;
}

interface CreateCosmeticsOrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  sku?: string;
  options?: Record<string, any>;
  productSnapshot?: ProductSnapshot;
}

interface CreateCosmeticsOrderDto {
  sellerId: string;
  items: CreateCosmeticsOrderItemDto[];
  metadata: CosmeticsOrderMetadata;
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
// Validation Errors
// ============================================================================

const VALIDATION_ERRORS = {
  CHANNEL_REQUIRED: 'metadata.channel is required',
  INVALID_CHANNEL: 'metadata.channel must be "local" or "travel"',
  TRAVEL_GUIDE_REQUIRED: 'metadata.travel.guideId is required for travel channel',
  LOCAL_HAS_TRAVEL_FIELDS: 'Local channel order cannot have travel-specific fields',
  TRAVEL_HAS_LOCAL_FIELDS: 'Travel channel order cannot have local-specific fields',
  ITEMS_REQUIRED: 'At least one order item is required',
  SELLER_ID_REQUIRED: 'sellerId is required',
} as const;

// ============================================================================
// Controller Implementation
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

/**
 * Channel-specific validation
 */
function validateChannelMetadata(
  metadata: CosmeticsOrderMetadata
): { valid: boolean; error?: string } {
  // channel 필수
  if (!metadata?.channel) {
    return { valid: false, error: VALIDATION_ERRORS.CHANNEL_REQUIRED };
  }

  // channel 값 검증
  if (!['local', 'travel'].includes(metadata.channel)) {
    return { valid: false, error: VALIDATION_ERRORS.INVALID_CHANNEL };
  }

  // Local 채널 검증
  if (metadata.channel === 'local') {
    if (metadata.travel) {
      return { valid: false, error: VALIDATION_ERRORS.LOCAL_HAS_TRAVEL_FIELDS };
    }
  }

  // Travel 채널 검증
  if (metadata.channel === 'travel') {
    if (!metadata.travel?.guideId) {
      return { valid: false, error: VALIDATION_ERRORS.TRAVEL_GUIDE_REQUIRED };
    }
    if (metadata.local) {
      return { valid: false, error: VALIDATION_ERRORS.TRAVEL_HAS_LOCAL_FIELDS };
    }
  }

  return { valid: true };
}

/**
 * Create cosmetics order router
 */
export function createCosmeticsOrderController(
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  // ============================================================================
  // ORDER ENDPOINTS
  // ============================================================================

  /**
   * POST /cosmetics/orders
   * Create a new cosmetics order
   *
   * H2-0 핵심 엔드포인트:
   * - metadata.channel 필수
   * - 채널별 검증 (Local/Travel)
   * - OrderType = RETAIL 고정 (내부 처리)
   */
  router.post(
    '/',
    requireAuth,
    requireScope('cosmetics:write'),
    [
      body('sellerId').notEmpty().isUUID().withMessage('sellerId must be a valid UUID'),
      body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
      body('items.*.productId').notEmpty().isUUID().withMessage('productId must be a valid UUID'),
      body('items.*.productName').notEmpty().isString().withMessage('productName is required'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
      body('items.*.unitPrice').isInt({ min: 0 }).withMessage('unitPrice must be non-negative'),
      body('items.*.discount').optional().isInt({ min: 0 }),
      body('metadata').notEmpty().isObject().withMessage('metadata is required'),
      body('metadata.channel')
        .notEmpty()
        .isIn(['local', 'travel'])
        .withMessage('metadata.channel must be "local" or "travel"'),
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

        const dto: CreateCosmeticsOrderDto = req.body;

        // 채널별 추가 검증
        const channelValidation = validateChannelMetadata(dto.metadata);
        if (!channelValidation.valid) {
          return errorResponse(res, 400, 'CHANNEL_VALIDATION_ERROR', channelValidation.error!);
        }

        // 금액 계산
        const subtotal = dto.items.reduce((sum, item) => {
          return sum + item.quantity * item.unitPrice - (item.discount || 0);
        }, 0);
        const shippingFee = dto.shippingFee || 0;
        const discount = dto.discount || 0;
        const totalAmount = subtotal + shippingFee - discount;

        // 주문 번호 생성
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `COS-${dateStr}-${random}`;

        // 주문 응답 생성 (실제 DB 저장은 EcommerceOrderService 통해 처리)
        // H2-0에서는 API 레이어 검증만 구현
        const orderResponse = {
          id: `order-${Date.now()}`, // 임시 ID (실제 구현 시 DB에서 생성)
          orderNumber,
          orderType: 'retail', // Cosmetics = RETAIL 고정
          buyerId,
          sellerId: dto.sellerId,
          status: 'created',
          paymentStatus: 'pending',
          subtotal,
          shippingFee,
          discount,
          totalAmount,
          currency: 'KRW',
          metadata: dto.metadata,
          items: dto.items.map((item, index) => ({
            id: `item-${Date.now()}-${index}`,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            subtotal: item.quantity * item.unitPrice - (item.discount || 0),
            metadata: item.productSnapshot
              ? { productSnapshot: item.productSnapshot }
              : undefined,
          })),
          shippingAddress: dto.shippingAddress,
          createdAt: now.toISOString(),
        };

        console.log(`[Cosmetics Order] Created ${dto.metadata.channel} channel order:`, {
          orderNumber,
          channel: dto.metadata.channel,
          buyerId,
          sellerId: dto.sellerId,
          totalAmount,
          itemCount: dto.items.length,
        });

        res.status(201).json({
          data: orderResponse,
          message: `${dto.metadata.channel.toUpperCase()} channel order created successfully`,
        });
      } catch (error: any) {
        console.error('[Cosmetics Order] Create order error:', error);
        errorResponse(res, 500, 'ORDER_CREATE_ERROR', 'Failed to create order');
      }
    }
  );

  /**
   * GET /cosmetics/orders
   * List orders for current user (buyer)
   */
  router.get(
    '/',
    requireAuth,
    [
      query('channel').optional().isIn(['local', 'travel']),
      query('status').optional().isString(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        // H2-0에서는 빈 배열 반환 (실제 DB 조회는 추후 구현)
        res.json({
          data: [],
          pagination: {
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            total: 0,
            totalPages: 0,
          },
          filters: {
            channel: req.query.channel,
            status: req.query.status,
            buyerId,
          },
        });
      } catch (error: any) {
        console.error('[Cosmetics Order] List orders error:', error);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  /**
   * GET /cosmetics/orders/:id
   * Get single order by ID
   */
  router.get(
    '/:id',
    requireAuth,
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        // H2-0에서는 404 반환 (실제 DB 조회는 추후 구현)
        errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
      } catch (error: any) {
        console.error('[Cosmetics Order] Get order error:', error);
        errorResponse(res, 500, 'ORDER_GET_ERROR', 'Failed to get order');
      }
    }
  );

  return router;
}
