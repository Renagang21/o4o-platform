/**
 * GlycoPharm Checkout Controller
 *
 * WO-ORDER-TYPE-NORMALIZATION-V1
 *
 * ## 설계 원칙
 * - OrderType = RETAIL (거래 모델 구분자) + metadata.serviceKey = 'glycopharm'
 * - Core 위임 패턴: EcommerceOrderService.create() 동일 로직
 * - 채널 승인 검증 필수 (organization_channels)
 * - 상품-채널 매핑 검증 (organization_product_channels)
 * - sales_limit 검증
 * - Order.channel = null 유지, 채널 구분은 metadata.channelType
 *
 * ## 기존 주문 호환
 * - GET 엔드포인트: GLYCOPHARM(레거시) + RETAIL+serviceKey(신규) 모두 조회
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { DataSource, In, Brackets } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { opsMetrics, OPS } from '../../../services/ops-metrics.service.js';
import { validateSupplierSellerRelation } from '../../../core/checkout/checkout-guard.service.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
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

// ============================================================================
// Type Definitions
// ============================================================================

interface GlycopharmOrderMetadata {
  serviceKey: 'glycopharm';
  pharmacyId: string;
  pharmacyName?: string;
  pharmacyCode?: string;
  channelType: string;
  channelId: string;
  deliveryMethod?: 'pickup' | 'delivery';
  prescriptionInfo?: {
    required: boolean;
    verified?: boolean;
    referenceId?: string;
  };
}

interface CheckoutItemDto {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

interface CheckoutRequestDto {
  pharmacyId: string;
  items: CheckoutItemDto[];
  shippingAddress?: ShippingAddress;
  deliveryMethod?: 'pickup' | 'delivery';
  prescriptionInfo?: {
    required: boolean;
    referenceId?: string;
  };
}

// ============================================================================
// Constants & Helpers
// ============================================================================

const VALIDATION_ERRORS = {
  PHARMACY_NOT_FOUND: 'Pharmacy not found or inactive',
  PRODUCT_NOT_FOUND: 'One or more products not found',
  PRODUCT_INACTIVE: 'One or more products are not available',
  PRODUCT_OUT_OF_STOCK: 'One or more products are out of stock',
  ITEMS_REQUIRED: 'At least one order item is required',
  PHARMACY_REQUIRED: 'pharmacyId is required',
  INVALID_QUANTITY: 'Quantity must be at least 1',
  CHANNEL_NOT_APPROVED: '채널이 승인되지 않았습니다',
  PRODUCT_NOT_IN_CHANNEL: '채널에 노출되지 않은 상품입니다',
  SALES_LIMIT_EXCEEDED: '판매 한도를 초과했습니다',
  DISTRIBUTION_FORBIDDEN: '유통 정책에 의해 차단된 상품입니다',
} as const;

/**
 * Core-standard order number generation (ORD-YYYYMMDD-XXXX)
 * Matches EcommerceOrderService.generateOrderNumber()
 */
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
// Core Order Creation (Express-compatible delegation)
// ============================================================================

/**
 * Create order via E-commerce Core standard pattern.
 *
 * Mirrors EcommerceOrderService.create() logic for Express context.
 * Same orderNumber format (ORD-), same amount calculation, same structure.
 *
 * WO-O4O-SALES-LIMIT-HARDENING-V1: QueryRunner 기반으로 전환.
 * 외부 트랜잭션에서 호출 시 queryRunner.manager 사용.
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
      metadata?: Record<string, unknown>;
    }>;
    shippingAddress?: ShippingAddress;
    shippingFee?: number;
    discount?: number;
    metadata?: Record<string, unknown>;
    orderSource?: string;
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
    orderSource: dto.orderSource,
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
      metadata: itemDto.metadata,
    })
  );

  await orderItemRepo.save(items);

  logger.info('[EcommerceCore] Order created:', {
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

export function createCheckoutController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  const pharmacyRepo = dataSource.getRepository(OrganizationStore);
  const productRepo = dataSource.getRepository(GlycopharmProduct);

  /**
   * POST /checkout
   * Create a new order via E-commerce Core (OrderType = RETAIL)
   */
  router.post(
    '/',
    requireAuth,
    [
      body('pharmacyId').notEmpty().isUUID().withMessage('pharmacyId must be a valid UUID'),
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
    ],
    async (req: Request, res: Response) => {
      // WO-O4O-SALES-LIMIT-HARDENING-V1: QueryRunner 트랜잭션으로 전체 checkout 보호
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        opsMetrics.inc(OPS.CHECKOUT_ATTEMPT, { service: 'glycopharm' });

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
        // 1. 약국 검증 (트랜잭션 외부 — 읽기 전용)
        // ================================================================
        const pharmacy = await pharmacyRepo.findOne({
          where: { id: dto.pharmacyId, isActive: true },
        });

        if (!pharmacy) {
          await queryRunner.release();
          return errorResponse(res, 404, 'PHARMACY_NOT_FOUND', VALIDATION_ERRORS.PHARMACY_NOT_FOUND);
        }

        // ================================================================
        // 1-B. 공급 계약 검증 (WO-O4O-CHECKOUT-GUARD-ORGANIZATION-LEVEL-V1)
        // ================================================================
        const guardResult = await validateSupplierSellerRelation(dataSource, pharmacy.id);
        if (!guardResult.allowed) {
          await queryRunner.release();
          return errorResponse(res, 403, guardResult.code || 'SUPPLY_CONTRACT_NOT_APPROVED', guardResult.reason || '공급 계약이 승인되지 않았습니다');
        }

        // ================================================================
        // 2. 채널 승인 검증 (Phase C)
        // ================================================================
        const b2cChannels: Array<{ id: string }> = await dataSource.query(
          `SELECT id FROM organization_channels
           WHERE organization_id = $1
             AND channel_type = 'B2C'
             AND status = 'APPROVED'`,
          [pharmacy.id]
        );

        if (!b2cChannels || b2cChannels.length === 0) {
          await queryRunner.release();
          return errorResponse(res, 403, 'CHANNEL_NOT_APPROVED', VALIDATION_ERRORS.CHANNEL_NOT_APPROVED);
        }

        const b2cChannelId = b2cChannels[0].id;

        // ================================================================
        // 3. 상품 검증 및 조회
        //
        // WO-STORE-LOCAL-PRODUCT-HARDENING-V1: Checkout Guard
        // StoreLocalProduct(store_local_products)는 Display Domain이며
        // Commerce Object가 아니다.
        // 이 체크아웃은 GlycopharmProduct 엔티티(glycopharm_products)만 조회하므로
        // store_local_products의 UUID는 구조적으로 PRODUCT_NOT_FOUND로 거부된다.
        // → store_local_products ↔ ecommerce_order_items 교차 경로 없음 (검증 완료)
        // ================================================================
        const productIds = dto.items.map((item) => item.productId);
        const products = await productRepo.find({
          where: { id: In(productIds) },
        });

        if (products.length !== productIds.length) {
          const foundIds = new Set(products.map((p) => p.id));
          const missingIds = productIds.filter((id) => !foundIds.has(id));
          await queryRunner.release();
          return errorResponse(res, 404, 'PRODUCT_NOT_FOUND', VALIDATION_ERRORS.PRODUCT_NOT_FOUND, {
            missingProductIds: missingIds,
          });
        }

        const inactiveProducts = products.filter((p) => p.status !== 'active');
        if (inactiveProducts.length > 0) {
          opsMetrics.inc(OPS.CHECKOUT_BLOCKED_PRODUCT, { service: 'glycopharm' });
          await queryRunner.release();
          return errorResponse(res, 400, 'PRODUCT_INACTIVE', VALIDATION_ERRORS.PRODUCT_INACTIVE, {
            inactiveProductIds: inactiveProducts.map((p) => p.id),
          });
        }

        const productMap = new Map(products.map((p) => [p.id, p]));
        const outOfStockItems: string[] = [];

        for (const item of dto.items) {
          const product = productMap.get(item.productId)!;
          if (product.stock_quantity < item.quantity) {
            outOfStockItems.push(item.productId);
          }
        }

        if (outOfStockItems.length > 0) {
          opsMetrics.inc(OPS.CHECKOUT_BLOCKED_STOCK, { service: 'glycopharm' });
          await queryRunner.release();
          return errorResponse(res, 400, 'PRODUCT_OUT_OF_STOCK', VALIDATION_ERRORS.PRODUCT_OUT_OF_STOCK, {
            outOfStockProductIds: outOfStockItems,
          });
        }

        // ================================================================
        // 3-B. Distribution policy 검증 (WO-O4O-DISTRIBUTION-GAP-HARDENING-V1)
        // PRIVATE 제품: allowed_seller_ids에 organizationId 포함 필수
        // ================================================================
        const privateDistProducts: Array<{
          product_id: string;
          allowed_seller_ids: string[] | null;
        }> = await dataSource.query(
          `SELECT opl.product_id::text AS product_id, nsp.allowed_seller_ids
           FROM organization_product_listings opl
           JOIN neture_supplier_products nsp ON nsp.id = opl.product_id
           WHERE opl.organization_id = $1
             AND opl.service_key = 'kpa'
             AND opl.product_id::text = ANY($2::text[])
             AND nsp.distribution_type = 'PRIVATE'`,
          [pharmacy.id, productIds]
        );

        for (const pp of privateDistProducts) {
          if (!pp.allowed_seller_ids || !pp.allowed_seller_ids.includes(pharmacy.id)) {
            opsMetrics.inc(OPS.CHECKOUT_BLOCKED_DISTRIBUTION, { service: 'glycopharm' });
            await queryRunner.release();
            return errorResponse(res, 403, 'DISTRIBUTION_FORBIDDEN', VALIDATION_ERRORS.DISTRIBUTION_FORBIDDEN, {
              productId: pp.product_id,
            });
          }
        }

        // ================================================================
        // 4. 상품-채널 매핑 검증 (Phase D)
        // ================================================================
        const channelMappings: Array<{
          product_listing_id: string;
          product_id: string;
          sales_limit: number | null;
        }> = await dataSource.query(
          `SELECT opl.id AS product_listing_id,
                  opl.product_id::text AS product_id,
                  opc.sales_limit
           FROM organization_product_channels opc
           JOIN organization_product_listings opl
             ON opl.id = opc.product_listing_id
           JOIN organization_channels oc
             ON oc.id = opc.channel_id
           WHERE opc.channel_id = $1
             AND opl.organization_id = $2
             AND opl.service_key = 'kpa'
             AND opl.is_active = true
             AND opc.is_active = true
             AND oc.status = 'APPROVED'`,
          [b2cChannelId, pharmacy.id]
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
        // 5. 금액 계산 (트랜잭션 전 — 읽기 전용)
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
          const unitPrice = Number(product.sale_price ?? product.price);
          const itemSubtotal = item.quantity * unitPrice;

          orderItems.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: item.quantity,
            unitPrice,
            discount: 0,
            subtotal: itemSubtotal,
            metadata: {
              category: product.category,
              manufacturer: product.manufacturer,
              originalPrice: Number(product.price),
            },
          });
        }

        const shippingFee = dto.deliveryMethod === 'delivery' ? 3000 : 0;
        const discount = 0;

        // ================================================================
        // 6. 트랜잭션 시작 — sales_limit 검증 + 주문 생성 원자적 실행
        //    WO-O4O-SALES-LIMIT-HARDENING-V1 Phase 1
        // ================================================================
        await queryRunner.startTransaction();

        try {
          // 6a. sales_limit 검증 (PAID 기준 + FOR UPDATE)
          if (channelMappings.length > 0) {
            const productsWithLimit = channelMappings.filter((m) => m.sales_limit !== null);

            for (const mapping of productsWithLimit) {
              const requestedItem = dto.items.find((i) => i.productId === mapping.product_id);
              if (!requestedItem) continue;

              // PAID 주문만 카운트 + FOR UPDATE로 동시성 보호
              const soldResult: Array<{ sold: number }> = await queryRunner.query(
                `SELECT COALESCE(SUM(oi.quantity), 0)::int AS sold
                 FROM ecommerce_order_items oi
                 JOIN ecommerce_orders o ON o.id = oi."orderId"
                 WHERE oi."productId" = $1
                   AND o."sellerId" = $2
                   AND o.status = 'PAID'
                 FOR UPDATE OF o`,
                [mapping.product_id, pharmacy.id]
              );

              const currentSold = soldResult[0]?.sold || 0;
              if (currentSold + requestedItem.quantity > mapping.sales_limit!) {
                opsMetrics.inc(OPS.CHECKOUT_BLOCKED_SALES_LIMIT, { service: 'glycopharm' });
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

          // 6b. Core 위임 주문 생성
          const metadata: GlycopharmOrderMetadata = {
            serviceKey: 'glycopharm',
            pharmacyId: pharmacy.id,
            pharmacyName: pharmacy.name,
            pharmacyCode: pharmacy.code,
            channelType: 'B2C',
            channelId: b2cChannelId,
            deliveryMethod: dto.deliveryMethod || 'pickup',
            prescriptionInfo: dto.prescriptionInfo,
          };

          const savedOrder = await createCoreOrder(queryRunner.manager, {
            buyerId,
            sellerId: pharmacy.id,
            orderType: OrderType.RETAIL,
            items: orderItems,
            shippingAddress: dto.shippingAddress
              ? {
                  ...dto.shippingAddress,
                  phone: dto.shippingAddress.phone?.replace(/\D/g, '') || dto.shippingAddress.phone,
                }
              : undefined,
            shippingFee,
            discount,
            metadata: metadata as unknown as Record<string, unknown>,
            orderSource: 'online',
          });

          // 6c. Commit
          await queryRunner.commitTransaction();

          // ================================================================
          // 7. 응답 (트랜잭션 외부)
          // ================================================================
          opsMetrics.inc(OPS.CHECKOUT_SUCCESS, { service: 'glycopharm' });

          logger.info('[GlycoPharm Checkout] Order created:', {
            orderId: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            orderType: savedOrder.orderType,
            buyerId,
            pharmacyId: pharmacy.id,
            channelId: b2cChannelId,
            totalAmount: savedOrder.totalAmount,
            itemCount: orderItems.length,
          });

          res.status(201).json({
            success: true,
            data: {
              orderId: savedOrder.id,
              orderNumber: savedOrder.orderNumber,
              orderType: savedOrder.orderType,
              status: savedOrder.status,
              paymentStatus: savedOrder.paymentStatus,
              subtotal: savedOrder.subtotal,
              shippingFee: savedOrder.shippingFee,
              discount: savedOrder.discount,
              totalAmount: savedOrder.totalAmount,
              currency: savedOrder.currency,
              pharmacy: {
                id: pharmacy.id,
                name: pharmacy.name,
                code: pharmacy.code,
              },
              items: orderItems.map((item) => ({
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
        opsMetrics.inc(OPS.CHECKOUT_ERROR, { service: 'glycopharm' });
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] Create order error:', err);
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
   * Get current user's GlycoPharm orders
   *
   * 호환성: GLYCOPHARM(레거시) + RETAIL+serviceKey='glycopharm'(신규) 모두 조회
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

        const orderRepo = dataSource.getRepository(EcommerceOrder);
        const [orders, total] = await orderRepo
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.items', 'items')
          .where('order.buyerId = :buyerId', { buyerId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('order.orderType = :glycopharm', { glycopharm: OrderType.GLYCOPHARM })
                .orWhere(
                  "order.orderType = :retail AND order.metadata->>'serviceKey' = :serviceKey",
                  { retail: OrderType.RETAIL, serviceKey: 'glycopharm' }
                );
            })
          )
          .orderBy('order.createdAt', 'DESC')
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
            pharmacy: {
              id: (order.metadata as GlycopharmOrderMetadata)?.pharmacyId,
              name: (order.metadata as GlycopharmOrderMetadata)?.pharmacyName,
            },
            itemCount: (order.items as unknown[])?.length || 0,
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
        logger.error('[GlycoPharm Checkout] List orders error:', err);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  /**
   * GET /checkout/orders/:orderId
   * Get single order by ID
   *
   * 호환성: GLYCOPHARM(레거시) + RETAIL+serviceKey(신규) 모두 허용
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

        const orderRepoForGet = dataSource.getRepository(EcommerceOrder);
        const order = await orderRepoForGet
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.items', 'items')
          .where('order.id = :orderId', { orderId })
          .andWhere('order.buyerId = :buyerId', { buyerId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('order.orderType = :glycopharm', { glycopharm: OrderType.GLYCOPHARM })
                .orWhere(
                  "order.orderType = :retail AND order.metadata->>'serviceKey' = :serviceKey",
                  { retail: OrderType.RETAIL, serviceKey: 'glycopharm' }
                );
            })
          )
          .getOne();

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        const metadata = order.metadata as GlycopharmOrderMetadata;

        res.json({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            totalAmount: order.totalAmount,
            currency: order.currency,
            pharmacy: {
              id: metadata?.pharmacyId,
              name: metadata?.pharmacyName,
              code: metadata?.pharmacyCode,
            },
            deliveryMethod: metadata?.deliveryMethod,
            shippingAddress: order.shippingAddress,
            items: (order.items as EcommerceOrderItem[])?.map((item) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              subtotal: item.subtotal,
            })),
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] Get order error:', err);
        errorResponse(res, 500, 'ORDER_GET_ERROR', 'Failed to get order');
      }
    }
  );

  // ============================================================================
  // POST /checkout/cleanup-expired
  // WO-O4O-SALES-LIMIT-HARDENING-V1 Phase 3: CREATED 주문 TTL 정리
  //
  // 15분 이상 미결제 CREATED 주문을 자동 CANCELLED 처리.
  // Cron / admin 호출용. 인증 필수.
  // ============================================================================
  router.post(
    '/cleanup-expired',
    requireAuth,
    async (_req: Request, res: Response) => {
      try {
        const result = await dataSource.query(
          `UPDATE ecommerce_orders
           SET status = 'cancelled',
               "updatedAt" = NOW()
           WHERE status = 'created'
             AND "orderType" = 'RETAIL'
             AND metadata->>'serviceKey' = 'glycopharm'
             AND "createdAt" < NOW() - INTERVAL '15 minutes'
           RETURNING id, "orderNumber"`,
        );

        const cancelled = Array.isArray(result) ? result : [];

        logger.info('[GlycoPharm Checkout] Expired orders cleanup:', {
          cancelledCount: cancelled.length,
          orderIds: cancelled.map((r: { id: string }) => r.id),
        });

        res.json({
          success: true,
          data: {
            cancelledCount: cancelled.length,
            cancelledOrders: cancelled.map((r: { id: string; orderNumber: string }) => ({
              id: r.id,
              orderNumber: r.orderNumber,
            })),
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] Cleanup error:', err);
        errorResponse(res, 500, 'CLEANUP_ERROR', 'Failed to cleanup expired orders');
      }
    }
  );

  return router;
}
