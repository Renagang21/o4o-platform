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
import { DataSource, In, Brackets, type Repository } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
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
 */
async function createCoreOrder(
  orderRepo: Repository<EcommerceOrder>,
  orderItemRepo: Repository<EcommerceOrderItem>,
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

  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  const productRepo = dataSource.getRepository(GlycopharmProduct);
  const orderRepo = dataSource.getRepository(EcommerceOrder);
  const orderItemRepo = dataSource.getRepository(EcommerceOrderItem);

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
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const dto: CheckoutRequestDto = req.body;

        // ================================================================
        // 1. 약국 검증
        // ================================================================
        const pharmacy = await pharmacyRepo.findOne({
          where: { id: dto.pharmacyId, status: 'active' },
        });

        if (!pharmacy) {
          return errorResponse(res, 404, 'PHARMACY_NOT_FOUND', VALIDATION_ERRORS.PHARMACY_NOT_FOUND);
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
          return errorResponse(res, 403, 'CHANNEL_NOT_APPROVED', VALIDATION_ERRORS.CHANNEL_NOT_APPROVED);
        }

        const b2cChannelId = b2cChannels[0].id;

        // ================================================================
        // 3. 상품 검증 및 조회
        // ================================================================
        const productIds = dto.items.map((item) => item.productId);
        const products = await productRepo.find({
          where: { id: In(productIds) },
        });

        if (products.length !== productIds.length) {
          const foundIds = new Set(products.map((p) => p.id));
          const missingIds = productIds.filter((id) => !foundIds.has(id));
          return errorResponse(res, 404, 'PRODUCT_NOT_FOUND', VALIDATION_ERRORS.PRODUCT_NOT_FOUND, {
            missingProductIds: missingIds,
          });
        }

        const inactiveProducts = products.filter((p) => p.status !== 'active');
        if (inactiveProducts.length > 0) {
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
          return errorResponse(res, 400, 'PRODUCT_OUT_OF_STOCK', VALIDATION_ERRORS.PRODUCT_OUT_OF_STOCK, {
            outOfStockProductIds: outOfStockItems,
          });
        }

        // ================================================================
        // 4. 상품-채널 매핑 검증 (Phase D)
        // ================================================================
        const channelMappings: Array<{
          product_listing_id: string;
          external_product_id: string;
          sales_limit: number | null;
        }> = await dataSource.query(
          `SELECT opl.id AS product_listing_id,
                  opl.external_product_id,
                  opc.sales_limit
           FROM organization_product_channels opc
           JOIN organization_product_listings opl
             ON opl.id = opc.product_listing_id
           WHERE opc.channel_id = $1
             AND opl.organization_id = $2
             AND opl.service_key = 'kpa'
             AND opc.is_active = true`,
          [b2cChannelId, pharmacy.id]
        );

        // Soft check: only enforce if mappings exist for this channel
        if (channelMappings.length > 0) {
          const mappedProductIds = new Set(channelMappings.map((m) => m.external_product_id));

          const unmappedProducts = productIds.filter((pid) => !mappedProductIds.has(pid));
          if (unmappedProducts.length > 0) {
            return errorResponse(res, 400, 'PRODUCT_NOT_IN_CHANNEL', VALIDATION_ERRORS.PRODUCT_NOT_IN_CHANNEL, {
              unmappedProductIds: unmappedProducts,
            });
          }

          // ================================================================
          // 5. 판매 한도 검증 (Phase E)
          // ================================================================
          const productsWithLimit = channelMappings.filter((m) => m.sales_limit !== null);

          if (productsWithLimit.length > 0) {
            for (const mapping of productsWithLimit) {
              const requestedItem = dto.items.find((i) => i.productId === mapping.external_product_id);
              if (!requestedItem) continue;

              // Count existing sales for this product from this pharmacy
              const soldResult: Array<{ sold: number }> = await dataSource.query(
                `SELECT COALESCE(SUM(oi.quantity), 0)::int AS sold
                 FROM ecommerce_order_items oi
                 JOIN ecommerce_orders o ON o.id = oi."orderId"
                 WHERE oi."productId" = $1
                   AND o."sellerId" = $2
                   AND o.status NOT IN ('cancelled', 'refunded')`,
                [mapping.external_product_id, pharmacy.id]
              );

              const currentSold = soldResult[0]?.sold || 0;
              if (currentSold + requestedItem.quantity > mapping.sales_limit!) {
                return errorResponse(res, 400, 'SALES_LIMIT_EXCEEDED', VALIDATION_ERRORS.SALES_LIMIT_EXCEEDED, {
                  productId: mapping.external_product_id,
                  salesLimit: mapping.sales_limit,
                  currentSold,
                  requestedQuantity: requestedItem.quantity,
                });
              }
            }
          }
        }

        // ================================================================
        // 6. 금액 계산
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
        // 7. Core 위임 주문 생성 (Phase B)
        //    OrderType.RETAIL + metadata.serviceKey (Phase A)
        //    Order.channel = null, metadata.channelType 사용 (Phase F)
        // ================================================================
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

        const savedOrder = await createCoreOrder(orderRepo, orderItemRepo, {
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

        // ================================================================
        // 8. 응답
        // ================================================================
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
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] Create order error:', err);
        errorResponse(res, 500, 'ORDER_CREATE_ERROR', 'Failed to create order', {
          message: err.message,
        });
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

        const order = await orderRepo
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

  return router;
}
