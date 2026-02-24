/**
 * Cosmetics Order Controller
 *
 * WO-O4O-COSMETICS-ORDER-LAYER-COMPLETION-V1
 *
 * EcommerceOrder 기반 실제 DB 연동 구현.
 * Stub(가짜 ID, 빈 배열, 강제 404) 제거 → 실제 저장·조회.
 *
 * ## 설계 원칙
 * - OrderType = RETAIL + metadata.serviceKey = 'cosmetics'
 * - 채널 분기 = order.channel + metadata.channel ('local' | 'travel')
 * - TaxRefund는 Order 단위, Amount 저장 금지 (H2-3)
 * - Travel 전용 필터: DB JSONB 쿼리
 * - 공급 계약 검증 필수 (checkout-guard)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { DataSource, Brackets } from 'typeorm';
import {
  EcommerceOrder,
  EcommerceOrderItem,
  OrderType,
  OrderStatus,
  PaymentStatus,
  BuyerType,
  SellerType,
  type ShippingAddress,
} from '@o4o/ecommerce-core/entities';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { opsMetrics, OPS } from '../../../services/ops-metrics.service.js';
import { validateSupplierSellerRelation } from '../../../core/checkout/checkout-guard.service.js';

// ============================================================================
// Type Definitions
// ============================================================================

type OrderChannel = 'local' | 'travel';
type FulfillmentType = 'pickup' | 'delivery' | 'on-site';

/**
 * TaxRefund Metadata (H2-3 확정 스키마)
 *
 * 핵심 원칙:
 * - amount 필드 없음 (정산 시 계산)
 * - eligible은 필수
 * - 외부 연동은 reference만
 */
interface TaxRefundMeta {
  eligible: boolean;
  scheme?: 'standard' | 'instant';
  estimatedRate?: number;
  provider?: string;
  referenceId?: string;
  status?: 'pending' | 'requested' | 'completed' | 'rejected';
  requestedAt?: string;
  completedAt?: string;
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
  shippingAddress?: ShippingAddress;
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
  TAXREFUND_ELIGIBLE_REQUIRED: 'metadata.travel.taxRefund.eligible is required when taxRefund is provided',
  TAXREFUND_AMOUNT_FORBIDDEN: 'metadata.travel.taxRefund.amount is not allowed (H2-3: Rate-based only)',
  TAXREFUND_INVALID_SCHEME: 'metadata.travel.taxRefund.scheme must be "standard" or "instant"',
  TAXREFUND_INVALID_RATE: 'metadata.travel.taxRefund.estimatedRate must be between 0 and 1',
  TAXREFUND_INVALID_STATUS: 'metadata.travel.taxRefund.status must be one of: pending, requested, completed, rejected',
  INVALID_TAX_REFUND_STATUS_FILTER: 'taxRefundStatus must be one of: pending, requested, completed, rejected',
  INVALID_TAX_REFUND_ELIGIBLE_FILTER: 'taxRefundEligible must be "true" or "false"',
  PRODUCT_NOT_AVAILABLE: 'One or more products are not available or not listed',
} as const;

const VALID_TAX_REFUND_STATUSES = ['pending', 'requested', 'completed', 'rejected'] as const;
type TaxRefundStatusFilter = typeof VALID_TAX_REFUND_STATUSES[number];

interface OrderQueryFilters {
  channel?: OrderChannel;
  status?: string;
  guideId?: string;
  tourSessionId?: string;
  taxRefundEligible?: boolean;
  taxRefundStatus?: TaxRefundStatusFilter;
  page?: number;
  limit?: number;
}

// ============================================================================
// Helpers
// ============================================================================

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
 * TaxRefund validation (H3-0)
 */
function validateTaxRefund(
  taxRefund: TaxRefundMeta & { amount?: number }
): { valid: boolean; error?: string } {
  if (typeof taxRefund.eligible !== 'boolean') {
    return { valid: false, error: VALIDATION_ERRORS.TAXREFUND_ELIGIBLE_REQUIRED };
  }
  if ('amount' in taxRefund && taxRefund.amount !== undefined) {
    return { valid: false, error: VALIDATION_ERRORS.TAXREFUND_AMOUNT_FORBIDDEN };
  }
  if (taxRefund.scheme && !['standard', 'instant'].includes(taxRefund.scheme)) {
    return { valid: false, error: VALIDATION_ERRORS.TAXREFUND_INVALID_SCHEME };
  }
  if (taxRefund.estimatedRate !== undefined) {
    if (typeof taxRefund.estimatedRate !== 'number' ||
        taxRefund.estimatedRate < 0 ||
        taxRefund.estimatedRate > 1) {
      return { valid: false, error: VALIDATION_ERRORS.TAXREFUND_INVALID_RATE };
    }
  }
  const validStatuses = ['pending', 'requested', 'completed', 'rejected'];
  if (taxRefund.status && !validStatuses.includes(taxRefund.status)) {
    return { valid: false, error: VALIDATION_ERRORS.TAXREFUND_INVALID_STATUS };
  }
  return { valid: true };
}

/**
 * Channel-specific validation
 */
function validateChannelMetadata(
  metadata: CosmeticsOrderMetadata
): { valid: boolean; error?: string } {
  if (!metadata?.channel) {
    return { valid: false, error: VALIDATION_ERRORS.CHANNEL_REQUIRED };
  }
  if (!['local', 'travel'].includes(metadata.channel)) {
    return { valid: false, error: VALIDATION_ERRORS.INVALID_CHANNEL };
  }
  if (metadata.channel === 'local') {
    if (metadata.travel) {
      return { valid: false, error: VALIDATION_ERRORS.LOCAL_HAS_TRAVEL_FIELDS };
    }
  }
  if (metadata.channel === 'travel') {
    if (!metadata.travel?.guideId) {
      return { valid: false, error: VALIDATION_ERRORS.TRAVEL_GUIDE_REQUIRED };
    }
    if (metadata.local) {
      return { valid: false, error: VALIDATION_ERRORS.TRAVEL_HAS_LOCAL_FIELDS };
    }
    if (metadata.travel.taxRefund) {
      const taxRefundValidation = validateTaxRefund(
        metadata.travel.taxRefund as TaxRefundMeta & { amount?: number }
      );
      if (!taxRefundValidation.valid) {
        return taxRefundValidation;
      }
    }
  }
  return { valid: true };
}

/**
 * Parse and validate query filters for order listing (H3-1)
 */
function parseOrderFilters(queryParams: Record<string, any>): {
  valid: boolean;
  filters?: OrderQueryFilters;
  error?: string;
} {
  const filters: OrderQueryFilters = {};

  if (queryParams.channel) {
    if (!['local', 'travel'].includes(queryParams.channel)) {
      return { valid: false, error: VALIDATION_ERRORS.INVALID_CHANNEL };
    }
    filters.channel = queryParams.channel as OrderChannel;
  }
  if (queryParams.status) {
    filters.status = queryParams.status;
  }
  if (queryParams.guideId) {
    filters.guideId = queryParams.guideId;
    if (!filters.channel) filters.channel = 'travel';
  }
  if (queryParams.tourSessionId) {
    filters.tourSessionId = queryParams.tourSessionId;
    if (!filters.channel) filters.channel = 'travel';
  }
  if (queryParams.taxRefundEligible !== undefined) {
    const eligibleStr = String(queryParams.taxRefundEligible).toLowerCase();
    if (eligibleStr !== 'true' && eligibleStr !== 'false') {
      return { valid: false, error: VALIDATION_ERRORS.INVALID_TAX_REFUND_ELIGIBLE_FILTER };
    }
    filters.taxRefundEligible = eligibleStr === 'true';
    if (!filters.channel) filters.channel = 'travel';
  }
  if (queryParams.taxRefundStatus) {
    if (!VALID_TAX_REFUND_STATUSES.includes(queryParams.taxRefundStatus)) {
      return { valid: false, error: VALIDATION_ERRORS.INVALID_TAX_REFUND_STATUS_FILTER };
    }
    filters.taxRefundStatus = queryParams.taxRefundStatus as TaxRefundStatusFilter;
    if (!filters.channel) filters.channel = 'travel';
  }
  filters.page = queryParams.page ? Number(queryParams.page) : 1;
  filters.limit = queryParams.limit ? Number(queryParams.limit) : 20;
  return { valid: true, filters };
}

/**
 * Order number generation (COS-YYYYMMDD-XXXX)
 */
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `COS-${dateStr}-${random}`;
}

// ============================================================================
// Core Order Creation (GlycoPharm checkout.controller.ts 패턴 동일)
// ============================================================================

/**
 * Create order via E-commerce Core standard pattern.
 *
 * 트랜잭션 manager를 통해 Order + Items 원자적 생성.
 */
async function createCoreOrder(
  manager: import('typeorm').EntityManager,
  dto: {
    buyerId: string;
    sellerId: string;
    orderType: OrderType;
    items: Array<{
      productId?: string;
      productName: string;
      sku?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      options?: Record<string, any>;
      metadata?: Record<string, unknown>;
    }>;
    shippingAddress?: ShippingAddress;
    shippingFee?: number;
    discount?: number;
    metadata?: Record<string, unknown>;
    channel?: string;
    storeId?: string;
  }
): Promise<EcommerceOrder> {
  const subtotal = dto.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice - (item.discount || 0));
  }, 0);

  const shippingFee = dto.shippingFee || 0;
  const discount = dto.discount || 0;
  const totalAmount = subtotal + shippingFee - discount;

  const orderRepo = manager.getRepository(EcommerceOrder);
  const orderItemRepo = manager.getRepository(EcommerceOrderItem);

  const order = orderRepo.create({
    orderNumber: generateOrderNumber(),
    buyerId: dto.buyerId,
    buyerType: BuyerType.USER,
    sellerId: dto.sellerId,
    sellerType: SellerType.ORGANIZATION,
    orderType: dto.orderType,
    subtotal,
    shippingFee,
    discount,
    totalAmount,
    currency: 'KRW',
    paymentStatus: PaymentStatus.PENDING,
    status: OrderStatus.CREATED,
    shippingAddress: dto.shippingAddress,
    metadata: dto.metadata,
    channel: dto.channel,
    storeId: dto.storeId,
    orderSource: 'online',
  });

  const savedOrder = await orderRepo.save(order);

  const items = dto.items.map((itemDto) =>
    orderItemRepo.create({
      orderId: savedOrder.id,
      productId: itemDto.productId,
      productName: itemDto.productName,
      sku: itemDto.sku,
      quantity: itemDto.quantity,
      unitPrice: itemDto.unitPrice,
      discount: itemDto.discount || 0,
      subtotal: itemDto.quantity * itemDto.unitPrice - (itemDto.discount || 0),
      options: itemDto.options,
      metadata: itemDto.metadata,
    })
  );

  await orderItemRepo.save(items);

  logger.info('[EcommerceCore] Cosmetics order created:', {
    orderId: savedOrder.id,
    orderNumber: savedOrder.orderNumber,
    orderType: savedOrder.orderType,
    sellerId: savedOrder.sellerId,
    totalAmount: savedOrder.totalAmount,
  });

  return savedOrder;
}

// ============================================================================
// Controller Implementation
// ============================================================================

export function createCosmeticsOrderController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  // ==========================================================================
  // POST /cosmetics/orders — 주문 생성
  // ==========================================================================
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
        opsMetrics.inc(OPS.CHECKOUT_ATTEMPT, { service: 'cosmetics' });

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

        // 공급 계약 검증
        const guardResult = await validateSupplierSellerRelation(dataSource, dto.sellerId);
        if (!guardResult.allowed) {
          return errorResponse(res, 403, guardResult.code || 'SUPPLY_CONTRACT_NOT_APPROVED', guardResult.reason || '공급 계약이 승인되지 않았습니다');
        }

        // ================================================================
        // 제품 존재/활성 검증 (WO-O4O-DISTRIBUTION-GAP-HARDENING-V1)
        // cosmetics_store_listings + cosmetics_products 기반
        //
        // WO-STORE-LOCAL-PRODUCT-HARDENING-V1: Checkout Guard
        // StoreLocalProduct(store_local_products)는 Display Domain이며
        // Commerce Object가 아니다.
        // 이 체크아웃은 cosmetics.cosmetics_products / cosmetics_store_listings만 조회하므로
        // store_local_products의 UUID는 구조적으로 PRODUCT_NOT_AVAILABLE로 거부된다.
        // → store_local_products ↔ ecommerce_order_items 교차 경로 없음 (검증 완료)
        // ================================================================
        const productIds = dto.items.map((item) => item.productId);

        if (dto.metadata.storeId) {
          // storeId 있는 경우: listing 가시성 + product 활성 상태 동시 검증
          const validProducts: Array<{ product_id: string }> = await dataSource.query(
            `SELECT csl.product_id
             FROM cosmetics.cosmetics_store_listings csl
             JOIN cosmetics.cosmetics_products cp ON cp.id = csl.product_id
             WHERE csl.store_id = $1
               AND csl.product_id = ANY($2::uuid[])
               AND csl.is_visible = true
               AND cp.status = 'visible'`,
            [dto.metadata.storeId, productIds]
          );
          const validProductIds = new Set(validProducts.map((p) => p.product_id));
          const invalidProducts = productIds.filter((pid) => !validProductIds.has(pid));

          if (invalidProducts.length > 0) {
            opsMetrics.inc(OPS.CHECKOUT_BLOCKED_PRODUCT, { service: 'cosmetics' });
            return errorResponse(res, 409, 'PRODUCT_NOT_AVAILABLE', VALIDATION_ERRORS.PRODUCT_NOT_AVAILABLE, {
              invalidProductIds: invalidProducts,
            });
          }
        } else {
          // storeId 없는 경우: product 상태만 검증
          const validProducts: Array<{ id: string }> = await dataSource.query(
            `SELECT id
             FROM cosmetics.cosmetics_products
             WHERE id = ANY($1::uuid[])
               AND status = 'visible'`,
            [productIds]
          );
          const validProductIds = new Set(validProducts.map((p) => p.id));
          const invalidProducts = productIds.filter((pid) => !validProductIds.has(pid));

          if (invalidProducts.length > 0) {
            opsMetrics.inc(OPS.CHECKOUT_BLOCKED_PRODUCT, { service: 'cosmetics' });
            return errorResponse(res, 409, 'PRODUCT_NOT_AVAILABLE', VALIDATION_ERRORS.PRODUCT_NOT_AVAILABLE, {
              invalidProductIds: invalidProducts,
            });
          }
        }

        // 트랜잭션으로 Order + Items 원자적 생성
        let savedOrder!: EcommerceOrder;

        await dataSource.transaction(async (manager) => {
          const metadata: Record<string, unknown> = {
            ...dto.metadata,
            serviceKey: 'cosmetics',
          };

          savedOrder = await createCoreOrder(manager, {
            buyerId,
            sellerId: dto.sellerId,
            orderType: OrderType.RETAIL,
            items: dto.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              options: item.options,
              metadata: item.productSnapshot
                ? { productSnapshot: item.productSnapshot }
                : undefined,
            })),
            shippingAddress: dto.shippingAddress,
            shippingFee: dto.shippingFee,
            discount: dto.discount,
            metadata,
            channel: dto.metadata.channel,
            storeId: dto.metadata.storeId,
          });
        });

        // 로깅
        const logData: Record<string, any> = {
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          channel: dto.metadata.channel,
          buyerId,
          sellerId: dto.sellerId,
          totalAmount: Number(savedOrder.totalAmount),
          itemCount: dto.items.length,
        };

        if (dto.metadata.channel === 'travel' && dto.metadata.travel) {
          logData.guideId = dto.metadata.travel.guideId;
          logData.tourSessionId = dto.metadata.travel.tourSessionId;
          if (dto.metadata.travel.taxRefund) {
            logData.taxRefund = {
              eligible: dto.metadata.travel.taxRefund.eligible,
              scheme: dto.metadata.travel.taxRefund.scheme,
              estimatedRate: dto.metadata.travel.taxRefund.estimatedRate,
            };
          }
        }

        opsMetrics.inc(OPS.CHECKOUT_SUCCESS, { service: 'cosmetics' });

        logger.info('[Cosmetics Order] Created order:', logData);

        res.status(201).json({
          success: true,
          data: {
            orderId: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            orderType: savedOrder.orderType,
            status: savedOrder.status,
            paymentStatus: savedOrder.paymentStatus,
            subtotal: Number(savedOrder.subtotal),
            shippingFee: Number(savedOrder.shippingFee),
            discount: Number(savedOrder.discount),
            totalAmount: Number(savedOrder.totalAmount),
            currency: savedOrder.currency,
            channel: dto.metadata.channel,
            items: dto.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              subtotal: item.quantity * item.unitPrice - (item.discount || 0),
            })),
            createdAt: savedOrder.createdAt,
          },
          message: `${dto.metadata.channel.toUpperCase()} channel order created successfully`,
        });
      } catch (error: unknown) {
        opsMetrics.inc(OPS.CHECKOUT_ERROR, { service: 'cosmetics' });
        const err = error as Error;
        logger.error('[Cosmetics Order] Create order error:', err);
        errorResponse(res, 500, 'ORDER_CREATE_ERROR', 'Failed to create order');
      }
    }
  );

  // ==========================================================================
  // GET /cosmetics/orders — 주문 목록 조회 (DB 기반)
  // ==========================================================================
  router.get(
    '/',
    requireAuth,
    [
      query('channel').optional().isIn(['local', 'travel']),
      query('status').optional().isString(),
      query('guideId').optional().isString(),
      query('tourSessionId').optional().isString(),
      query('taxRefundEligible').optional().isString(),
      query('taxRefundStatus').optional().isString(),
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

        // Parse and validate filters
        const filterResult = parseOrderFilters(req.query);
        if (!filterResult.valid) {
          return errorResponse(res, 400, 'FILTER_VALIDATION_ERROR', filterResult.error!);
        }

        const filters = filterResult.filters!;
        const page = filters.page || 1;
        const limit = Math.min(filters.limit || 20, 100);
        const offset = (page - 1) * limit;

        // Build DB query
        const orderRepo = dataSource.getRepository(EcommerceOrder);
        const qb = orderRepo
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.items', 'items')
          .where('order.buyerId = :buyerId', { buyerId })
          .andWhere('order.orderType = :orderType', { orderType: OrderType.RETAIL })
          .andWhere("order.metadata->>'serviceKey' = :serviceKey", { serviceKey: 'cosmetics' });

        // Channel filter (indexed column)
        if (filters.channel) {
          qb.andWhere('order.channel = :channel', { channel: filters.channel });
        }

        // Status filter
        if (filters.status) {
          qb.andWhere('order.status = :status', { status: filters.status });
        }

        // Travel-specific JSONB filters
        if (filters.guideId) {
          qb.andWhere("order.metadata->'travel'->>'guideId' = :guideId", {
            guideId: filters.guideId,
          });
        }
        if (filters.tourSessionId) {
          qb.andWhere("order.metadata->'travel'->>'tourSessionId' = :tourSessionId", {
            tourSessionId: filters.tourSessionId,
          });
        }
        if (filters.taxRefundEligible !== undefined) {
          qb.andWhere("order.metadata->'travel'->'taxRefund'->>'eligible' = :eligible", {
            eligible: String(filters.taxRefundEligible),
          });
        }
        if (filters.taxRefundStatus) {
          qb.andWhere("order.metadata->'travel'->'taxRefund'->>'status' = :taxRefundStatus", {
            taxRefundStatus: filters.taxRefundStatus,
          });
        }

        qb.orderBy('order.createdAt', 'DESC')
          .take(limit)
          .skip(offset);

        const [orders, total] = await qb.getManyAndCount();
        const totalPages = Math.ceil(total / limit);

        // Build applied filters info
        const appliedFilters: Record<string, any> = { buyerId };
        if (filters.channel) appliedFilters.channel = filters.channel;
        if (filters.status) appliedFilters.status = filters.status;
        if (filters.guideId) appliedFilters.guideId = filters.guideId;
        if (filters.tourSessionId) appliedFilters.tourSessionId = filters.tourSessionId;
        if (filters.taxRefundEligible !== undefined) {
          appliedFilters.taxRefundEligible = filters.taxRefundEligible;
        }
        if (filters.taxRefundStatus) {
          appliedFilters.taxRefundStatus = filters.taxRefundStatus;
        }

        logger.info('[Cosmetics Order] List orders:', appliedFilters);

        res.json({
          success: true,
          data: orders.map((order) => {
            const meta = order.metadata as CosmeticsOrderMetadata & { serviceKey: string };
            return {
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: order.paymentStatus,
              totalAmount: Number(order.totalAmount),
              channel: meta?.channel,
              storeName: meta?.storeName,
              itemCount: (order.items as unknown[])?.length || 0,
              createdAt: order.createdAt,
            };
          }),
          pagination: { page, limit, total, totalPages },
          filters: appliedFilters,
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[Cosmetics Order] List orders error:', err);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  // ==========================================================================
  // GET /cosmetics/orders/:id — 단건 조회
  // ==========================================================================
  router.get(
    '/:id',
    requireAuth,
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const orderRepo = dataSource.getRepository(EcommerceOrder);
        const order = await orderRepo
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.items', 'items')
          .where('order.id = :orderId', { orderId: req.params.id })
          .andWhere('order.buyerId = :buyerId', { buyerId })
          .andWhere('order.orderType = :orderType', { orderType: OrderType.RETAIL })
          .andWhere("order.metadata->>'serviceKey' = :serviceKey", { serviceKey: 'cosmetics' })
          .getOne();

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        const metadata = order.metadata as CosmeticsOrderMetadata & { serviceKey: string };

        res.json({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: Number(order.subtotal),
            shippingFee: Number(order.shippingFee),
            discount: Number(order.discount),
            totalAmount: Number(order.totalAmount),
            currency: order.currency,
            channel: metadata?.channel,
            store: metadata?.storeId ? {
              id: metadata.storeId,
              name: metadata.storeName,
            } : undefined,
            fulfillment: metadata?.fulfillment,
            travel: metadata?.travel,
            shippingAddress: order.shippingAddress,
            items: (order.items as EcommerceOrderItem[])?.map((item) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              discount: Number(item.discount),
              subtotal: Number(item.subtotal),
              options: item.options,
              metadata: item.metadata,
            })),
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[Cosmetics Order] Get order error:', err);
        errorResponse(res, 500, 'ORDER_GET_ERROR', 'Failed to get order');
      }
    }
  );

  return router;
}
