/**
 * KPA Checkout Controller
 *
 * WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
 *
 * ## 설계 원칙
 * - OrderType = RETAIL (거래 모델 구분자) + metadata.serviceKey = 'kpa'
 * - Core 위임 패턴: GlycoPharm checkout.controller.ts 1:1 복사 + serviceKey 치환
 * - 채널 승인 검증 필수 (organization_channels)
 * - 상품-채널 매핑 검증 (organization_product_channels)
 * - sales_limit 검증
 * - 상품 조회: supplier_product_offers + product_masters JOIN
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { opsMetrics, OPS } from '../../../services/ops-metrics.service.js';
import { validateSupplierSellerRelation } from '../../../core/checkout/checkout-guard.service.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import {
  CheckoutOrder,
  CheckoutOrderStatus,
  CheckoutPaymentStatus,
  type ShippingAddress,
} from '../../../entities/checkout/CheckoutOrder.entity.js';
import { OrderLog, OrderAction } from '../../../entities/checkout/OrderLog.entity.js';
import { checkoutService } from '../../../services/checkout.service.js';

// ============================================================================
// Type Definitions
// ============================================================================

interface KpaOrderMetadata {
  serviceKey: 'kpa-society' | 'kpa';
  organizationId: string;
  organizationName?: string;
  channelType: string;
  channelId: string;
  deliveryMethod?: 'pickup' | 'delivery';
  referral?: {
    referrerId: string;
    referrerType: string;
  };
}

interface CheckoutItemDto {
  productId: string;
  quantity: number;
}

interface CheckoutRequestDto {
  organizationId: string;
  items: CheckoutItemDto[];
  shippingAddress?: ShippingAddress;
  deliveryMethod?: 'pickup' | 'delivery';
  referral?: {
    referrerId: string;
    referrerType: string;
  };
}

// ============================================================================
// Constants & Helpers
// ============================================================================

const VALIDATION_ERRORS = {
  ORGANIZATION_NOT_FOUND: 'Organization not found or inactive',
  PRODUCT_NOT_FOUND: 'One or more products not found',
  PRODUCT_INACTIVE: 'One or more products are not available',
  PRODUCT_OUT_OF_STOCK: 'One or more products are out of stock',
  ITEMS_REQUIRED: 'At least one order item is required',
  ORGANIZATION_REQUIRED: 'organizationId is required',
  CHANNEL_NOT_APPROVED: '채널이 승인되지 않았습니다',
  PRODUCT_NOT_IN_CHANNEL: '채널에 노출되지 않은 상품입니다',
  SALES_LIMIT_EXCEEDED: '판매 한도를 초과했습니다',
  DISTRIBUTION_FORBIDDEN: '유통 정책에 의해 차단된 상품입니다',
} as const;

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${dateStr}-${random}`;
}

function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
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

// ============================================================================
// Core Order Creation — CheckoutOrder (checkout_orders) 기반
// ============================================================================

async function createCheckoutOrder(
  manager: import('typeorm').EntityManager,
  dto: {
    buyerId: string;
    sellerId: string;
    supplierId: string;
    sellerOrganizationId?: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
    shippingAddress?: ShippingAddress;
    shippingFee?: number;
    discount?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<CheckoutOrder> {
  const subtotal = dto.items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = dto.shippingFee || 0;
  const discount = dto.discount || 0;
  const totalAmount = subtotal + shippingFee - discount;

  const orderRepo = manager.getRepository(CheckoutOrder);

  const order = orderRepo.create({
    orderNumber: generateOrderNumber(),
    buyerId: dto.buyerId,
    sellerId: dto.sellerId,
    supplierId: dto.supplierId,
    sellerOrganizationId: dto.sellerOrganizationId,
    items: dto.items,
    subtotal,
    shippingFee,
    discount,
    totalAmount,
    status: CheckoutOrderStatus.CREATED,
    paymentStatus: CheckoutPaymentStatus.PENDING,
    shippingAddress: dto.shippingAddress,
    metadata: dto.metadata,
  });

  const savedOrder = await orderRepo.save(order);

  logger.info('[KPA Checkout] Order created via CheckoutOrder:', {
    orderId: savedOrder.id,
    orderNumber: savedOrder.orderNumber,
    sellerId: savedOrder.sellerId,
    totalAmount: savedOrder.totalAmount,
  });

  return savedOrder;
}

// ============================================================================
// Controller Implementation
// ============================================================================

export function createKpaCheckoutController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  const organizationRepo = dataSource.getRepository(OrganizationStore);

  /**
   * POST /checkout
   * Create a new order via E-commerce Core (OrderType = RETAIL, serviceKey = 'kpa')
   */
  router.post(
    '/',
    requireAuth,
    [
      body('organizationId').notEmpty().isUUID().withMessage('organizationId must be a valid UUID'),
      body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
      body('items.*.productId').notEmpty().isUUID().withMessage('productId must be a valid UUID'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
      body('deliveryMethod').optional().isIn(['pickup', 'delivery']),
      body('shippingAddress').optional().isObject(),
      body('shippingAddress.recipientName').optional().isString(),
      body('shippingAddress.phone').optional().isString(),
      body('shippingAddress.zipCode').optional().isString(),
      body('shippingAddress.address1').optional().isString(),
      body('shippingAddress.address2').optional().isString(),
      body('shippingAddress.memo').optional().isString(),
      body('referral').optional().isObject(),
      body('referral.referrerId').optional().isString().isLength({ min: 1, max: 255 }),
      body('referral.referrerType').optional().isIn(['partner', 'qr', 'content', 'external']),
    ],
    async (req: Request, res: Response) => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        opsMetrics.inc(OPS.CHECKOUT_ATTEMPT, { service: 'kpa' });

        if (handleValidationErrors(req, res)) {
          await queryRunner.release();
          return;
        }

        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          await queryRunner.release();
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const dto: CheckoutRequestDto = req.body;

        // ================================================================
        // 1. Organization 검증
        // ================================================================
        const organization = await organizationRepo.findOne({
          where: { id: dto.organizationId, isActive: true },
        });

        if (!organization) {
          await queryRunner.release();
          return errorResponse(res, 404, 'ORGANIZATION_NOT_FOUND', VALIDATION_ERRORS.ORGANIZATION_NOT_FOUND);
        }

        // ================================================================
        // 1-B. 공급 계약 검증
        // ================================================================
        const guardResult = await validateSupplierSellerRelation(dataSource, organization.id);
        if (!guardResult.allowed) {
          await queryRunner.release();
          return errorResponse(res, 403, guardResult.code || 'SUPPLY_CONTRACT_NOT_APPROVED', guardResult.reason || '공급 계약이 승인되지 않았습니다');
        }

        // ================================================================
        // 2. 채널 승인 검증
        // ================================================================
        const b2cChannels: Array<{ id: string }> = await dataSource.query(
          `SELECT id FROM organization_channels
           WHERE organization_id = $1
             AND channel_type = 'B2C'
             AND status = 'APPROVED'`,
          [organization.id]
        );

        if (!b2cChannels || b2cChannels.length === 0) {
          await queryRunner.release();
          return errorResponse(res, 403, 'CHANNEL_NOT_APPROVED', VALIDATION_ERRORS.CHANNEL_NOT_APPROVED);
        }

        const b2cChannelId = b2cChannels[0].id;

        // ================================================================
        // 3. 상품 검증 및 조회 (SPO + ProductMaster JOIN)
        // ================================================================
        const productIds = dto.items.map((item) => item.productId);

        const products: Array<{
          id: string;
          is_active: boolean;
          consumer_reference_price: number | null;
          price_general: number;
          stock_quantity: number;
          track_inventory: boolean;
          marketing_name: string;
          barcode: string;
          distribution_type: string;
          allowed_seller_ids: string[] | null;
        }> = await dataSource.query(
          `SELECT spo.id,
                  spo.is_active,
                  spo.consumer_reference_price,
                  spo.price_general,
                  spo.stock_quantity,
                  spo.track_inventory,
                  pm.marketing_name,
                  pm.barcode,
                  spo.distribution_type,
                  spo.allowed_seller_ids
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           WHERE spo.id = ANY($1::uuid[])`,
          [productIds]
        );

        if (products.length !== productIds.length) {
          const foundIds = new Set(products.map((p) => p.id));
          const missingIds = productIds.filter((id) => !foundIds.has(id));
          await queryRunner.release();
          return errorResponse(res, 404, 'PRODUCT_NOT_FOUND', VALIDATION_ERRORS.PRODUCT_NOT_FOUND, {
            missingProductIds: missingIds,
          });
        }

        const inactiveProducts = products.filter((p) => !p.is_active);
        if (inactiveProducts.length > 0) {
          opsMetrics.inc(OPS.CHECKOUT_BLOCKED_PRODUCT, { service: 'kpa' });
          await queryRunner.release();
          return errorResponse(res, 400, 'PRODUCT_INACTIVE', VALIDATION_ERRORS.PRODUCT_INACTIVE, {
            inactiveProductIds: inactiveProducts.map((p) => p.id),
          });
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Stock check (only for products with inventory tracking)
        const outOfStockItems: string[] = [];
        for (const item of dto.items) {
          const product = productMap.get(item.productId)!;
          if (product.track_inventory && product.stock_quantity < item.quantity) {
            outOfStockItems.push(item.productId);
          }
        }

        if (outOfStockItems.length > 0) {
          opsMetrics.inc(OPS.CHECKOUT_BLOCKED_STOCK, { service: 'kpa' });
          await queryRunner.release();
          return errorResponse(res, 400, 'PRODUCT_OUT_OF_STOCK', VALIDATION_ERRORS.PRODUCT_OUT_OF_STOCK, {
            outOfStockProductIds: outOfStockItems,
          });
        }

        // ================================================================
        // 3-B. Distribution policy 검증
        // ================================================================
        for (const product of products) {
          if (product.distribution_type === 'PRIVATE') {
            if (!product.allowed_seller_ids || !product.allowed_seller_ids.includes(organization.id)) {
              opsMetrics.inc(OPS.CHECKOUT_BLOCKED_DISTRIBUTION, { service: 'kpa' });
              await queryRunner.release();
              return errorResponse(res, 403, 'DISTRIBUTION_FORBIDDEN', VALIDATION_ERRORS.DISTRIBUTION_FORBIDDEN, {
                productId: product.id,
              });
            }
          }
        }

        // ================================================================
        // 4. 상품-채널 매핑 검증
        // ================================================================
        const channelMappings: Array<{
          product_listing_id: string;
          product_id: string;
          sales_limit: number | null;
        }> = await dataSource.query(
          `SELECT opl.id AS product_listing_id,
                  opl.offer_id::text AS product_id,
                  opc.sales_limit
           FROM organization_product_channels opc
           JOIN organization_product_listings opl
             ON opl.id = opc.product_listing_id
           JOIN organization_channels oc
             ON oc.id = opc.channel_id
           WHERE opc.channel_id = $1
             AND opl.organization_id = $2
             AND opl.service_key = 'kpa-society'
             AND opl.is_active = true
             AND opc.is_active = true
             AND oc.status = 'APPROVED'`,
          [b2cChannelId, organization.id]
        );

        // Soft check: only enforce if mappings exist for this channel
        if (channelMappings.length > 0) {
          const mappedProductIds = new Set(channelMappings.map((m) => m.product_id));

          const unmappedProducts = productIds.filter((pid) => !mappedProductIds.has(pid));
          if (unmappedProducts.length > 0) {
            await queryRunner.release();
            return errorResponse(res, 400, 'PRODUCT_NOT_IN_CHANNEL', VALIDATION_ERRORS.PRODUCT_NOT_IN_CHANNEL, {
              unmappedProductIds: unmappedProducts,
            });
          }
        }

        // ================================================================
        // 5. 금액 계산
        // ================================================================
        const orderItems: Array<{
          productId: string;
          productName: string;
          sku: string;
          quantity: number;
          unitPrice: number;
          discount: number;
          subtotal: number;
          metadata: Record<string, unknown>;
        }> = [];

        for (const item of dto.items) {
          const product = productMap.get(item.productId)!;
          const unitPrice = product.consumer_reference_price ?? product.price_general;
          const itemSubtotal = item.quantity * unitPrice;

          orderItems.push({
            productId: product.id,
            productName: product.marketing_name,
            sku: product.barcode,
            quantity: item.quantity,
            unitPrice,
            discount: 0,
            subtotal: itemSubtotal,
            metadata: {},
          });
        }

        const shippingFee = dto.deliveryMethod === 'delivery' ? 3000 : 0;
        const discount = 0;

        // ================================================================
        // 6. 트랜잭션 시작 — sales_limit 검증 + 주문 생성 원자적 실행
        // ================================================================
        await queryRunner.startTransaction();

        try {
          // 6a. sales_limit 검증 (PAID 기준 + FOR UPDATE)
          // checkout_orders.items는 JSONB 배열이므로 jsonb_array_elements 사용
          if (channelMappings.length > 0) {
            const productsWithLimit = channelMappings.filter((m) => m.sales_limit !== null);

            for (const mapping of productsWithLimit) {
              const requestedItem = dto.items.find((i) => i.productId === mapping.product_id);
              if (!requestedItem) continue;

              const soldResult: Array<{ sold: number }> = await queryRunner.query(
                `SELECT COALESCE(SUM((item->>'quantity')::int), 0)::int AS sold
                 FROM checkout_orders co,
                      jsonb_array_elements(co.items) AS item
                 WHERE item->>'productId' = $1
                   AND co."sellerId" = $2
                   AND co.status = 'paid'
                   AND co.metadata->>'serviceKey' IN ('kpa-society', 'kpa')
                 FOR UPDATE OF co`,
                [mapping.product_id, organization.id]
              );

              const currentSold = soldResult[0]?.sold || 0;
              if (currentSold + requestedItem.quantity > mapping.sales_limit!) {
                opsMetrics.inc(OPS.CHECKOUT_BLOCKED_SALES_LIMIT, { service: 'kpa' });
                await queryRunner.rollbackTransaction();
                await queryRunner.release();
                return errorResponse(res, 400, 'SALES_LIMIT_EXCEEDED', VALIDATION_ERRORS.SALES_LIMIT_EXCEEDED, {
                  productId: mapping.product_id,
                  salesLimit: mapping.sales_limit,
                  currentSold,
                  requestedQuantity: requestedItem.quantity,
                });
              }
            }
          }

          // 6b. CheckoutOrder 기반 주문 생성
          const metadata: KpaOrderMetadata = {
            serviceKey: 'kpa-society',
            organizationId: organization.id,
            organizationName: organization.name,
            channelType: 'B2C',
            channelId: b2cChannelId,
            deliveryMethod: dto.deliveryMethod || 'pickup',
            ...(dto.referral?.referrerId ? { referral: dto.referral } : {}),
          };

          const savedOrder = await createCheckoutOrder(queryRunner.manager, {
            buyerId,
            sellerId: organization.id,
            supplierId: organization.id,
            sellerOrganizationId: organization.id,
            items: orderItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            shippingAddress: dto.shippingAddress
              ? {
                  ...dto.shippingAddress,
                  phone: dto.shippingAddress.phone?.replace(/\D/g, '') || dto.shippingAddress.phone,
                }
              : undefined,
            shippingFee,
            discount,
            metadata: metadata as unknown as Record<string, unknown>,
          });

          // 6c. Commit
          await queryRunner.commitTransaction();

          // ================================================================
          // 7. 응답
          // ================================================================
          opsMetrics.inc(OPS.CHECKOUT_SUCCESS, { service: 'kpa' });

          logger.info('[KPA Checkout] Order created:', {
            orderId: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            buyerId,
            organizationId: organization.id,
            channelId: b2cChannelId,
            totalAmount: savedOrder.totalAmount,
            itemCount: orderItems.length,
          });

          res.status(201).json({
            success: true,
            data: {
              orderId: savedOrder.id,
              orderNumber: savedOrder.orderNumber,
              orderType: 'retail',
              status: savedOrder.status,
              paymentStatus: savedOrder.paymentStatus,
              subtotal: savedOrder.subtotal,
              shippingFee: savedOrder.shippingFee,
              discount: savedOrder.discount,
              totalAmount: savedOrder.totalAmount,
              currency: 'KRW',
              organization: {
                id: organization.id,
                name: organization.name,
              },
              items: savedOrder.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              })),
              createdAt: savedOrder.createdAt,
            },
            message: 'Order created successfully',
          });
        } catch (txError) {
          await queryRunner.rollbackTransaction();
          throw txError;
        }
      } catch (error: unknown) {
        opsMetrics.inc(OPS.CHECKOUT_ERROR, { service: 'kpa' });
        const err = error as Error;
        logger.error('[KPA Checkout] Create order error:', err);
        errorResponse(res, 500, 'ORDER_CREATE_ERROR', 'Failed to create order', {
          message: err.message,
        });
      } finally {
        await queryRunner.release();
      }
    }
  );

  /**
   * GET /checkout/orders
   * Get current user's KPA orders
   */
  router.get(
    '/orders',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        const orderRepo = dataSource.getRepository(CheckoutOrder);
        const [orders, total] = await orderRepo
          .createQueryBuilder('co')
          .where('co.buyerId = :buyerId', { buyerId })
          .andWhere(
            "co.metadata->>'serviceKey' IN (:...serviceKeys)",
            { serviceKeys: ['kpa-society', 'kpa'] }
          )
          .orderBy('co.createdAt', 'DESC')
          .take(limit)
          .skip(offset)
          .getManyAndCount();

        res.json({
          success: true,
          data: orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            organization: {
              id: (order.metadata as KpaOrderMetadata)?.organizationId,
              name: (order.metadata as KpaOrderMetadata)?.organizationName,
            },
            itemCount: order.items?.length || 0,
            createdAt: order.createdAt,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] List orders error:', err);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  /**
   * GET /checkout/orders/:orderId
   * Get single order by ID
   */
  router.get(
    '/orders/:orderId',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;
        const { orderId } = req.params;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const orderRepo = dataSource.getRepository(CheckoutOrder);
        const order = await orderRepo
          .createQueryBuilder('co')
          .where('co.id = :orderId', { orderId })
          .andWhere('co.buyerId = :buyerId', { buyerId })
          .andWhere(
            "co.metadata->>'serviceKey' IN (:...serviceKeys)",
            { serviceKeys: ['kpa-society', 'kpa'] }
          )
          .getOne();

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        const metadata = order.metadata as KpaOrderMetadata;

        res.json({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: 'retail',
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            totalAmount: order.totalAmount,
            currency: 'KRW',
            organization: {
              id: metadata?.organizationId,
              name: metadata?.organizationName,
            },
            deliveryMethod: metadata?.deliveryMethod,
            shippingAddress: order.shippingAddress,
            items: order.items?.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] Get order error:', err);
        errorResponse(res, 500, 'ORDER_GET_ERROR', 'Failed to get order');
      }
    }
  );

  // ==========================================================================
  // Store Owner Endpoints (WO-STORE-B2B-ORDER-EXECUTION-FLOW-V1)
  // 판매자 관점: 매장 주문 목록 + KPI
  // ==========================================================================

  const requireStoreOwner = createRequireStoreOwner(dataSource);

  /**
   * GET /checkout/store-orders/kpi
   * 매장 주문 KPI (총 주문 / 진행 중 / 완료 / 이번 달 매출)
   */
  router.get(
    '/store-orders/kpi',
    requireAuth,
    requireStoreOwner,
    async (req: Request, res: Response) => {
      try {
        const organizationId = (req as any).organizationId;
        if (!organizationId) {
          return res.json({
            success: true,
            data: { total: 0, pending: 0, completed: 0, monthlyRevenue: 0 },
          });
        }

        const rows = await dataSource.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status IN ('created','pending_payment'))::int AS pending,
             COUNT(*) FILTER (WHERE status = 'paid')::int AS completed,
             COALESCE(SUM("totalAmount") FILTER (
               WHERE "createdAt" >= date_trunc('month', CURRENT_DATE) AND status = 'paid'
             ), 0)::numeric AS "monthlyRevenue"
           FROM checkout_orders
           WHERE "sellerOrganizationId" = $1
             AND metadata->>'serviceKey' IN ('kpa-society', 'kpa')`,
          [organizationId]
        );

        const row = rows[0] || {};
        res.json({
          success: true,
          data: {
            total: Number(row.total || 0),
            pending: Number(row.pending || 0),
            completed: Number(row.completed || 0),
            monthlyRevenue: Number(row.monthlyRevenue || 0),
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] Store KPI error:', err);
        // Graceful degradation
        res.json({
          success: true,
          data: { total: 0, pending: 0, completed: 0, monthlyRevenue: 0 },
        });
      }
    }
  );

  /**
   * GET /checkout/store-orders/:orderId
   * 매장 주문 상세 (판매자 관점)
   * WO-STORE-ORDER-MANAGEMENT-FULL-IMPLEMENTATION-V1
   */
  router.get(
    '/store-orders/:orderId',
    requireAuth,
    requireStoreOwner,
    async (req: Request, res: Response) => {
      try {
        const organizationId = (req as any).organizationId;
        const { orderId } = req.params;
        if (!organizationId || !orderId) {
          return errorResponse(res, 400, 'INVALID_REQUEST', 'Missing required parameters');
        }

        // 주문 조회 (boundary: sellerOrganizationId + serviceKey)
        const order = await dataSource.getRepository(CheckoutOrder).findOne({
          where: { id: orderId, sellerOrganizationId: organizationId },
        });

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        const meta = order.metadata as KpaOrderMetadata | null;
        if (!meta || !['kpa-society', 'kpa'].includes(meta.serviceKey)) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        // Buyer info (마스킹)
        let buyerName = '—';
        let buyerEmail = '—';
        try {
          const users = await dataSource.query(
            `SELECT name, email FROM users WHERE id = $1 LIMIT 1`,
            [order.buyerId]
          );
          if (users.length > 0) {
            buyerName = users[0].name || '—';
            const email = users[0].email || '';
            if (email.includes('@')) {
              const [local, domain] = email.split('@');
              buyerEmail = `${local.slice(0, 3)}***@${domain}`;
            }
          }
        } catch {
          // buyer info lookup failure is non-critical
        }

        // Payments
        let payments: any[] = [];
        try {
          payments = await dataSource.query(
            `SELECT id, amount, status, method, "cardCompany", "approvedAt",
                    "refundedAmount", "refundReason", "refundedAt", "createdAt"
             FROM checkout_payments
             WHERE "orderId" = $1
             ORDER BY "createdAt" DESC`,
            [orderId]
          );
        } catch {
          // payments table may not exist in some environments
        }

        // Logs
        let logs: any[] = [];
        try {
          logs = await dataSource.query(
            `SELECT id, action, "previousStatus", "newStatus", "performedBy",
                    "performerType", message, "createdAt"
             FROM checkout_order_logs
             WHERE "orderId" = $1
             ORDER BY "createdAt" DESC`,
            [orderId]
          );
        } catch {
          // logs table may not exist in some environments
        }

        res.json({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            buyerName,
            buyerEmail,
            items: (order.items || []).map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            metadata: {
              serviceKey: meta.serviceKey,
              channelType: meta.channelType,
              deliveryMethod: meta.deliveryMethod,
              organizationName: meta.organizationName,
            },
            shippingAddress: order.shippingAddress || null,
            payments,
            logs,
            paidAt: order.paidAt,
            cancelledAt: order.cancelledAt,
            refundedAt: order.refundedAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] Store order detail error:', err);
        errorResponse(res, 500, 'STORE_ORDER_DETAIL_ERROR', 'Failed to get order detail');
      }
    }
  );

  /**
   * PATCH /checkout/store-orders/:orderId/status
   * 매장 주문 상태 변경 (취소/환불)
   * WO-STORE-ORDER-MANAGEMENT-FULL-IMPLEMENTATION-V1
   */
  router.patch(
    '/store-orders/:orderId/status',
    requireAuth,
    requireStoreOwner,
    body('action').isIn(['cancel', 'refund']).withMessage('action must be cancel or refund'),
    body('reason').isString().notEmpty().withMessage('reason is required'),
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return errorResponse(res, 400, 'VALIDATION_ERROR', errors.array()[0]?.msg || 'Invalid input');
        }

        const organizationId = (req as any).organizationId;
        const userId = (req as any).user?.id;
        const { orderId } = req.params;
        const { action, reason } = req.body;

        if (!organizationId || !orderId) {
          return errorResponse(res, 400, 'INVALID_REQUEST', 'Missing required parameters');
        }

        // 주문 조회 (boundary guard)
        const orderRepo = dataSource.getRepository(CheckoutOrder);
        const order = await orderRepo.findOne({
          where: { id: orderId, sellerOrganizationId: organizationId },
        });

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        const meta = order.metadata as KpaOrderMetadata | null;
        if (!meta || !['kpa-society', 'kpa'].includes(meta.serviceKey)) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        if (action === 'cancel') {
          // cancel: created or pending_payment → cancelled
          if (order.status !== CheckoutOrderStatus.CREATED &&
              order.status !== CheckoutOrderStatus.PENDING_PAYMENT) {
            return errorResponse(
              res, 400, 'INVALID_TRANSITION',
              `Cannot cancel order in '${order.status}' status. Only 'created' or 'pending_payment' orders can be cancelled.`
            );
          }

          const previousStatus = order.status;
          order.status = CheckoutOrderStatus.CANCELLED;
          order.cancelledAt = new Date();
          await orderRepo.save(order);

          // OrderLog
          const logRepo = dataSource.getRepository(OrderLog);
          const log = logRepo.create({
            orderId: order.id,
            action: OrderAction.CANCELLED,
            previousStatus,
            newStatus: CheckoutOrderStatus.CANCELLED,
            performedBy: userId || 'system',
            performerType: 'operator',
            message: reason,
          });
          await logRepo.save(log);

          logger.info(`[KPA Checkout] Order ${order.orderNumber} cancelled by operator ${userId}`);
        } else if (action === 'refund') {
          // refund: paid → refunded (delegate to checkoutService)
          if (order.status !== CheckoutOrderStatus.PAID) {
            return errorResponse(
              res, 400, 'INVALID_TRANSITION',
              `Cannot refund order in '${order.status}' status. Only 'paid' orders can be refunded.`
            );
          }

          try {
            await checkoutService.refundOrder(orderId, {
              reason,
              performedBy: userId || 'system',
              performerType: 'operator',
            });
          } catch (refundError: unknown) {
            const rErr = refundError as Error;
            logger.error(`[KPA Checkout] Refund failed for ${order.orderNumber}:`, rErr);
            return errorResponse(res, 400, 'REFUND_FAILED', rErr.message || 'Refund failed');
          }

          logger.info(`[KPA Checkout] Order ${order.orderNumber} refunded by operator ${userId}`);
        }

        // 갱신된 주문 반환
        const updated = await orderRepo.findOne({ where: { id: orderId } });
        if (!updated) {
          return errorResponse(res, 500, 'ORDER_REFRESH_ERROR', 'Failed to refresh order');
        }

        res.json({
          success: true,
          data: {
            id: updated.id,
            orderNumber: updated.orderNumber,
            status: updated.status,
            paymentStatus: updated.paymentStatus,
            totalAmount: updated.totalAmount,
            paidAt: updated.paidAt,
            cancelledAt: updated.cancelledAt,
            refundedAt: updated.refundedAt,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] Store order status change error:', err);
        errorResponse(res, 500, 'STATUS_CHANGE_ERROR', 'Failed to change order status');
      }
    }
  );

  /**
   * GET /checkout/store-orders
   * 매장 주문 목록 (판매자 관점 — sellerOrganizationId 기준)
   */
  router.get(
    '/store-orders',
    requireAuth,
    requireStoreOwner,
    async (req: Request, res: Response) => {
      try {
        const organizationId = (req as any).organizationId;
        if (!organizationId) {
          return res.json({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          });
        }

        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const status = req.query.status as string | undefined;

        const qb = dataSource.getRepository(CheckoutOrder)
          .createQueryBuilder('co')
          .where('co.sellerOrganizationId = :organizationId', { organizationId })
          .andWhere(
            "co.metadata->>'serviceKey' IN (:...serviceKeys)",
            { serviceKeys: ['kpa-society', 'kpa'] }
          );

        if (status && status !== 'all') {
          qb.andWhere('co.status = :status', { status });
        }

        qb.orderBy('co.createdAt', 'DESC')
          .take(limit)
          .skip(offset);

        const [orders, total] = await qb.getManyAndCount();

        res.json({
          success: true,
          data: orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            buyerId: order.buyerId,
            itemCount: order.items?.length || 0,
            items: order.items?.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            metadata: {
              channelType: (order.metadata as KpaOrderMetadata)?.channelType,
              deliveryMethod: (order.metadata as KpaOrderMetadata)?.deliveryMethod,
              organizationName: (order.metadata as KpaOrderMetadata)?.organizationName,
            },
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] Store orders list error:', err);
        errorResponse(res, 500, 'STORE_ORDER_LIST_ERROR', 'Failed to list store orders');
      }
    }
  );

  return router;
}
