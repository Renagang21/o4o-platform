/**
 * GlycoPharm Checkout Controller
 *
 * Phase 4-B: E-commerce Core Integration
 *
 * ## 설계 원칙
 * - OrderType = GLYCOPHARM (E-commerce Core 표준)
 * - checkoutService.createOrder() 패턴 준수
 * - pharmacyId 필수 (판매자 = 약국)
 * - glycopharm_products 기준 상품 조회
 *
 * @since Phase 4-B (2025-01-XX)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { DataSource, In } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
// Import entities directly to avoid NestJS dependency from main package
import {
  EcommerceOrder,
  OrderType,
  OrderStatus,
  PaymentStatus,
  BuyerType,
  SellerType,
  type ShippingAddress,
} from '@o4o/ecommerce-core/dist/entities/EcommerceOrder.entity.js';
import { EcommerceOrderItem } from '@o4o/ecommerce-core/dist/entities/EcommerceOrderItem.entity.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * GlycoPharm 주문 메타데이터
 */
interface GlycopharmOrderMetadata {
  /** 서비스 식별자 */
  serviceKey: 'glycopharm';
  /** 약국 ID */
  pharmacyId: string;
  /** 약국명 */
  pharmacyName?: string;
  /** 약국 코드 */
  pharmacyCode?: string;
  /** 배송 방법 */
  deliveryMethod?: 'pickup' | 'delivery';
  /** 처방전 정보 (선택) */
  prescriptionInfo?: {
    required: boolean;
    verified?: boolean;
    referenceId?: string;
  };
}

/**
 * 주문 아이템 요청 DTO
 */
interface CheckoutItemDto {
  productId: string;
  quantity: number;
  /** 선택: 클라이언트에서 전달하는 가격 (서버에서 검증) */
  unitPrice?: number;
}

/**
 * Checkout 요청 DTO
 */
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
// Validation Errors
// ============================================================================

const VALIDATION_ERRORS = {
  PHARMACY_NOT_FOUND: 'Pharmacy not found or inactive',
  PRODUCT_NOT_FOUND: 'One or more products not found',
  PRODUCT_INACTIVE: 'One or more products are not available',
  PRODUCT_OUT_OF_STOCK: 'One or more products are out of stock',
  ITEMS_REQUIRED: 'At least one order item is required',
  PHARMACY_REQUIRED: 'pharmacyId is required',
  INVALID_QUANTITY: 'Quantity must be at least 1',
  PRICE_MISMATCH: 'Price mismatch detected',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 주문 번호 생성
 */
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `GP-${dateStr}-${random}`;
}

/**
 * Error response helper
 */
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
 * Create GlycoPharm checkout controller
 *
 * @param dataSource TypeORM DataSource
 * @param requireAuth Authentication middleware
 */
export function createCheckoutController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  // Repositories
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  const productRepo = dataSource.getRepository(GlycopharmProduct);
  const orderRepo = dataSource.getRepository(EcommerceOrder);
  const orderItemRepo = dataSource.getRepository(EcommerceOrderItem);

  /**
   * POST /checkout
   * Create a new GlycoPharm order via E-commerce Core
   *
   * Phase 4-B 핵심 엔드포인트:
   * - pharmacyId 필수 검증
   * - 상품 유효성 검증 (활성 상태, 재고)
   * - E-commerce Core 표준 주문 생성
   * - OrderType = GLYCOPHARM
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
        // Express-validator 검증
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
        // 2. 상품 검증 및 조회
        // ================================================================
        const productIds = dto.items.map((item) => item.productId);
        const products = await productRepo.find({
          where: { id: In(productIds) },
        });

        // 모든 상품이 존재하는지 확인
        if (products.length !== productIds.length) {
          const foundIds = new Set(products.map((p) => p.id));
          const missingIds = productIds.filter((id) => !foundIds.has(id));
          return errorResponse(res, 404, 'PRODUCT_NOT_FOUND', VALIDATION_ERRORS.PRODUCT_NOT_FOUND, {
            missingProductIds: missingIds,
          });
        }

        // 상품 상태 검증 (활성 상태인지)
        const inactiveProducts = products.filter((p) => p.status !== 'active');
        if (inactiveProducts.length > 0) {
          return errorResponse(res, 400, 'PRODUCT_INACTIVE', VALIDATION_ERRORS.PRODUCT_INACTIVE, {
            inactiveProductIds: inactiveProducts.map((p) => p.id),
          });
        }

        // 재고 검증
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
        // 3. 금액 계산
        // ================================================================
        let subtotal = 0;
        const orderItems: {
          productId: string;
          productName: string;
          sku: string;
          quantity: number;
          unitPrice: number;
          discount: number;
          subtotal: number;
          metadata: Record<string, unknown>;
        }[] = [];

        for (const item of dto.items) {
          const product = productMap.get(item.productId)!;
          const unitPrice = Number(product.sale_price ?? product.price);
          const itemSubtotal = item.quantity * unitPrice;
          subtotal += itemSubtotal;

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

        const shippingFee = dto.deliveryMethod === 'delivery' ? 3000 : 0; // 배송비 (픽업은 무료)
        const discount = 0;
        const totalAmount = subtotal + shippingFee - discount;

        // ================================================================
        // 4. 주문 생성 (E-commerce Core 표준)
        // ================================================================
        const orderNumber = generateOrderNumber();

        const metadata: GlycopharmOrderMetadata = {
          serviceKey: 'glycopharm',
          pharmacyId: pharmacy.id,
          pharmacyName: pharmacy.name,
          pharmacyCode: pharmacy.code,
          deliveryMethod: dto.deliveryMethod || 'pickup',
          prescriptionInfo: dto.prescriptionInfo,
        };

        // EcommerceOrder 생성
        const order = orderRepo.create({
          orderNumber,
          buyerId,
          buyerType: BuyerType.USER,
          sellerId: pharmacy.id,
          sellerType: SellerType.ORGANIZATION,
          orderType: OrderType.GLYCOPHARM,
          subtotal,
          shippingFee,
          discount,
          totalAmount,
          currency: 'KRW',
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.CREATED,
          shippingAddress: dto.shippingAddress,
          metadata,
        });

        const savedOrder = await orderRepo.save(order);

        // EcommerceOrderItem 생성
        const items = orderItems.map((itemData) =>
          orderItemRepo.create({
            orderId: savedOrder.id,
            productId: itemData.productId,
            productName: itemData.productName,
            sku: itemData.sku,
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
            discount: itemData.discount,
            subtotal: itemData.subtotal,
            metadata: itemData.metadata,
          })
        );

        await orderItemRepo.save(items);

        // ================================================================
        // 5. 응답 반환
        // ================================================================
        logger.info('[GlycoPharm Checkout] Order created:', {
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          buyerId,
          pharmacyId: pharmacy.id,
          pharmacyName: pharmacy.name,
          totalAmount,
          itemCount: items.length,
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
            items: items.map((item) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            createdAt: savedOrder.createdAt,
          },
          message: 'GlycoPharm order created successfully',
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

        // GlycoPharm 주문만 조회
        const [orders, total] = await orderRepo.findAndCount({
          where: {
            buyerId,
            orderType: OrderType.GLYCOPHARM,
          },
          relations: ['items'],
          order: { createdAt: 'DESC' },
          take: limit,
          skip: offset,
        });

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

        const order = await orderRepo.findOne({
          where: {
            id: orderId,
            buyerId,
            orderType: OrderType.GLYCOPHARM,
          },
          relations: ['items'],
        });

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
